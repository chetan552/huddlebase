import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';
import {
    applyBlockToEvents,
    isAvailabilityStatus,
    AVAILABILITY_STATUSES,
} from '@/lib/availability';

/**
 * Season-long availability blocks.
 *
 * A parent can manage blocks for their own linked children, and team staff can view
 * (but not create) blocks for their roster so they can plan around absences.
 */

const MAX_BLOCK_DAYS = 400;

/** Users the caller may create or edit availability for: themselves and their children. */
async function manageableUserIds(userId: string): Promise<Set<string>> {
    const links = await prisma.familyLink.findMany({
        where: { parentId: userId, status: 'ACTIVE' },
        select: { childId: true },
    });
    return new Set([userId, ...links.map((l) => l.childId)]);
}

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get('teamId');
        const scope = searchParams.get('scope'); // 'team' for the staff roster view

        let userIds: string[];

        if (scope === 'team' && teamId) {
            if (!(await isTeamStaff(user, teamId))) {
                return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
            }
            const members = await prisma.teamMember.findMany({
                where: { teamId },
                select: { userId: true },
            });
            userIds = members.map((m) => m.userId);
        } else {
            userIds = Array.from(await manageableUserIds(user.id));
        }

        const blocks = await prisma.availabilityBlock.findMany({
            where: {
                userId: { in: userIds },
                ...(teamId && { OR: [{ teamId }, { teamId: null }] }),
                // Past blocks are noise once they've elapsed.
                endDate: { gte: new Date(Date.now() - 7 * 86400000) },
            },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
                team: { select: { id: true, name: true } },
            },
            orderBy: { startDate: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: blocks.map((b) => ({
                id: b.id,
                userId: b.userId,
                userName: b.user.name,
                userAvatar: b.user.avatar,
                teamId: b.teamId,
                teamName: b.team?.name ?? null,
                startDate: b.startDate.toISOString(),
                endDate: b.endDate.toISOString(),
                status: b.status,
                reason: b.reason,
                createdAt: b.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error('Fetch availability error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch availability' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { userId, teamId, startDate, endDate, status, reason } = await req.json();
        const targetUserId = userId || user.id;

        const allowed = await manageableUserIds(user.id);
        if (!allowed.has(targetUserId)) {
            return NextResponse.json(
                { success: false, error: 'You can only set availability for yourself or your children' },
                { status: 403 },
            );
        }

        if (!startDate || !endDate) {
            return NextResponse.json({ success: false, error: 'Start and end dates are required' }, { status: 400 });
        }

        const start = new Date(startDate);
        const end = new Date(endDate);
        if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
            return NextResponse.json({ success: false, error: 'Invalid date' }, { status: 400 });
        }
        if (end.getTime() < start.getTime()) {
            return NextResponse.json({ success: false, error: 'End date must be on or after the start date' }, { status: 400 });
        }
        if ((end.getTime() - start.getTime()) / 86400000 > MAX_BLOCK_DAYS) {
            return NextResponse.json(
                { success: false, error: `Blocks cannot span more than ${MAX_BLOCK_DAYS} days` },
                { status: 400 },
            );
        }

        const blockStatus = status || 'UNAVAILABLE';
        if (!isAvailabilityStatus(blockStatus)) {
            return NextResponse.json(
                { success: false, error: `Status must be one of ${AVAILABILITY_STATUSES.join(', ')}` },
                { status: 400 },
            );
        }

        if (teamId) {
            const membership = await prisma.teamMember.findFirst({
                where: { userId: targetUserId, teamId },
                select: { id: true },
            });
            if (!membership) {
                return NextResponse.json({ success: false, error: 'Not a member of that team' }, { status: 403 });
            }
        }

        // A bare date means the whole day, so stretch the end to 23:59:59.999 —
        // otherwise an evening practice on the last day would fall outside the block.
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(endDate).trim())) {
            end.setUTCHours(23, 59, 59, 999);
        }

        const block = await prisma.availabilityBlock.create({
            data: {
                userId: targetUserId,
                teamId: teamId || null,
                startDate: start,
                endDate: end,
                status: blockStatus,
                reason: reason?.trim() || null,
            },
        });

        const rsvpsUpdated = await applyBlockToEvents(block);

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: block.id,
                    userId: block.userId,
                    teamId: block.teamId,
                    startDate: block.startDate.toISOString(),
                    endDate: block.endDate.toISOString(),
                    status: block.status,
                    reason: block.reason,
                },
                meta: { rsvpsUpdated },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('Create availability error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save availability' }, { status: 500 });
    }
}
