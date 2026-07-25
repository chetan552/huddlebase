import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';
import { isAssignmentRole, planRotation, loadRotationCandidates, roleLabel } from '@/lib/assignments';
import { notifyUsers } from '@/lib/notify';

const MAX_EVENTS = 100;

/**
 * Fill a duty across upcoming events, spreading turns evenly.
 *
 * Only replaces slots the rotation itself created — a duty a coach assigned by hand,
 * or one someone has already accepted, is left untouched.
 */
export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId, role, eventType, from, to, slotsPerEvent, memberRoles, notify } = await req.json();

        if (!teamId || !isAssignmentRole(role)) {
            return NextResponse.json({ success: false, error: 'teamId and a valid role are required' }, { status: 400 });
        }
        if (!(await isTeamStaff(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can run a rotation' }, { status: 403 });
        }

        const slots = Number.isInteger(slotsPerEvent) && slotsPerEvent > 0 ? Math.min(slotsPerEvent, 5) : 1;
        const fromDate = from && !Number.isNaN(new Date(from).getTime()) ? new Date(from) : new Date();
        const toDate = to && !Number.isNaN(new Date(to).getTime()) ? new Date(to) : null;

        const events = await prisma.event.findMany({
            where: {
                teamId,
                isCancelled: false,
                startTime: { gte: fromDate, ...(toDate && { lte: toDate }) },
                ...(eventType && { type: eventType }),
            },
            select: { id: true, title: true, startTime: true },
            orderBy: { startTime: 'asc' },
            take: MAX_EVENTS,
        });

        if (events.length === 0) {
            return NextResponse.json({ success: false, error: 'No upcoming events in that range' }, { status: 400 });
        }

        const candidates = await loadRotationCandidates(teamId, {
            role,
            ...(Array.isArray(memberRoles) && memberRoles.length > 0 && { roles: memberRoles }),
        });

        if (candidates.length === 0) {
            return NextResponse.json(
                { success: false, error: 'No eligible team members to rotate between' },
                { status: 400 },
            );
        }

        // Slots already spoken for: accepted duties, and anything a coach set by hand.
        const locked = await prisma.eventAssignment.findMany({
            where: {
                role,
                eventId: { in: events.map((e) => e.id) },
                OR: [{ autoAssigned: false }, { status: 'ACCEPTED' }],
            },
            select: { eventId: true },
        });
        const lockedEventIds = new Set(locked.map((l) => l.eventId));
        const openEvents = events.filter((e) => !lockedEventIds.has(e.id));

        if (openEvents.length === 0) {
            return NextResponse.json(
                { success: false, error: 'Every event in that range already has this duty assigned' },
                { status: 400 },
            );
        }

        const plan = planRotation({
            eventIds: openEvents.map((e) => e.id),
            candidates,
            role,
            slotsPerEvent: slots,
        });

        await prisma.$transaction(async (tx) => {
            // Clear the rotation's previous, still-unanswered picks before re-planning,
            // so re-running doesn't stack duplicates on the same event.
            await tx.eventAssignment.deleteMany({
                where: {
                    role,
                    eventId: { in: openEvents.map((e) => e.id) },
                    autoAssigned: true,
                    status: { not: 'ACCEPTED' },
                },
            });

            await tx.eventAssignment.createMany({
                data: plan.map((p) => ({
                    eventId: p.eventId,
                    userId: p.userId,
                    role: p.role,
                    autoAssigned: true,
                })),
            });
        });

        if (notify) {
            const eventById = new Map(events.map((e) => [e.id, e]));
            const byUser = new Map<string, number>();
            for (const p of plan) {
                byUser.set(p.userId, (byUser.get(p.userId) ?? 0) + 1);
            }

            // One summary per person rather than one notification per date.
            await Promise.all(
                Array.from(byUser.entries()).map(([userId, count]) => {
                    const firstEventId = plan.find((p) => p.userId === userId)?.eventId;
                    const first = firstEventId ? eventById.get(firstEventId) : null;
                    const when = first
                        ? first.startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : '';
                    return notifyUsers({
                        userIds: [userId],
                        type: 'ASSIGNMENT',
                        title: `${roleLabel(role)} duty scheduled`,
                        body: count === 1
                            ? `You're on ${roleLabel(role)} for the event on ${when}`
                            : `You're on ${roleLabel(role)} for ${count} events, starting ${when}`,
                        link: '/schedule',
                    });
                }),
            );
        }

        // Per-person totals so the UI can show the resulting distribution.
        const distribution = candidates.map((c) => ({
            userId: c.userId,
            name: c.name,
            assigned: plan.filter((p) => p.userId === c.userId).length,
            previous: c.existingCount,
        }));

        return NextResponse.json({
            success: true,
            data: {
                created: plan.length,
                eventsCovered: openEvents.length,
                skipped: lockedEventIds.size,
                distribution,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Rotate assignments error:', error);
        return NextResponse.json({ success: false, error: 'Failed to run rotation' }, { status: 500 });
    }
}
