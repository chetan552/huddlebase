import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember, isTeamStaff, isUserOnTeam } from '@/lib/permissions';
import { isAssignmentRole, roleLabel } from '@/lib/assignments';
import { notifyUsers } from '@/lib/notify';

/** Duty assignments for one event. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id: eventId } = await params;
        const event = await prisma.event.findUnique({ where: { id: eventId }, select: { teamId: true } });
        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }
        if (!(await isTeamMember(user, event.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const assignments = await prisma.eventAssignment.findMany({
            where: { eventId },
            include: { user: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: assignments.map((a) => ({
                id: a.id,
                role: a.role,
                roleLabel: roleLabel(a.role, a.label),
                label: a.label,
                notes: a.notes,
                status: a.status,
                autoAssigned: a.autoAssigned,
                userId: a.userId,
                userName: a.user?.name ?? null,
                userAvatar: a.user?.avatar ?? null,
                isMine: a.userId === user.id,
            })),
        });
    } catch (error) {
        console.error('Fetch assignments error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch assignments' }, { status: 500 });
    }
}

/** Create an assignment. Staff only — this hands a duty to someone. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id: eventId } = await params;
        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { teamId: true, title: true, startTime: true, team: { select: { name: true } } },
        });
        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, event.teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can assign duties' }, { status: 403 });
        }

        const { role, userId, label, notes } = await req.json();

        if (!isAssignmentRole(role)) {
            return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
        }
        if (role === 'OTHER' && !label?.trim()) {
            return NextResponse.json({ success: false, error: 'A label is required for "Other"' }, { status: 400 });
        }
        // userId is optional: an unassigned slot advertises the need without naming anyone.
        if (userId && !(await isUserOnTeam(userId, event.teamId))) {
            return NextResponse.json({ success: false, error: 'That person is not on this team' }, { status: 400 });
        }

        const assignment = await prisma.eventAssignment.create({
            data: {
                eventId,
                userId: userId || null,
                role,
                label: label?.trim()?.slice(0, 80) || null,
                notes: notes?.trim()?.slice(0, 300) || null,
            },
            include: { user: { select: { id: true, name: true, avatar: true } } },
        });

        if (userId) {
            const when = event.startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            await notifyUsers({
                userIds: [userId],
                type: 'ASSIGNMENT',
                title: `You're on ${roleLabel(role, label)} duty`,
                body: `${event.title} on ${when} — ${event.team.name}`,
                link: '/schedule',
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: assignment.id,
                role: assignment.role,
                roleLabel: roleLabel(assignment.role, assignment.label),
                status: assignment.status,
                userId: assignment.userId,
                userName: assignment.user?.name ?? null,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Create assignment error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create assignment' }, { status: 500 });
    }
}
