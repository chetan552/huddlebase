import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff, isUserOnTeam } from '@/lib/permissions';
import { roleLabel } from '@/lib/assignments';
import { notifyUsers } from '@/lib/notify';

/**
 * Accept, decline, or reassign a duty.
 *
 * The assignee can change their own status; only staff can move a duty to someone
 * else or edit its details.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const assignment = await prisma.eventAssignment.findUnique({
            where: { id },
            include: {
                event: {
                    select: { id: true, teamId: true, title: true, startTime: true, team: { select: { name: true } } },
                },
            },
        });
        if (!assignment) {
            return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
        }

        const { status, userId, notes, label } = await req.json();
        const staff = await isTeamStaff(user, assignment.event.teamId);
        const isAssignee = assignment.userId === user.id;

        if (!staff && !isAssignee) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        // Reassigning is a staff action; an assignee may only answer for themselves.
        if (!staff && (userId !== undefined || notes !== undefined || label !== undefined)) {
            return NextResponse.json({ success: false, error: 'Only team staff can reassign duties' }, { status: 403 });
        }

        if (status !== undefined && !['ASSIGNED', 'ACCEPTED', 'DECLINED'].includes(status)) {
            return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }
        if (userId && !(await isUserOnTeam(userId, assignment.event.teamId))) {
            return NextResponse.json({ success: false, error: 'That person is not on this team' }, { status: 400 });
        }

        const updated = await prisma.eventAssignment.update({
            where: { id },
            data: {
                ...(status !== undefined && { status }),
                ...(notes !== undefined && { notes: notes?.trim()?.slice(0, 300) || null }),
                ...(label !== undefined && { label: label?.trim()?.slice(0, 80) || null }),
                ...(userId !== undefined && {
                    userId: userId || null,
                    // A hand-picked reassignment is no longer the rotation's doing.
                    autoAssigned: false,
                    status: 'ASSIGNED',
                }),
            },
            include: { user: { select: { id: true, name: true } } },
        });

        // Tell the coach when someone drops out, so the slot gets refilled.
        if (status === 'DECLINED' && isAssignee) {
            const staffMembers = await prisma.teamMember.findMany({
                where: { teamId: assignment.event.teamId, role: { in: ['COACH', 'MANAGER'] } },
                select: { userId: true },
            });
            if (staffMembers.length > 0) {
                const when = assignment.event.startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                await notifyUsers({
                    userIds: staffMembers.map((m) => m.userId),
                    type: 'ASSIGNMENT',
                    title: `${user.name} declined ${roleLabel(assignment.role, assignment.label)}`,
                    body: `${assignment.event.title} on ${when} needs someone else`,
                    link: '/schedule',
                });
            }
        }

        // Notify the newly assigned person.
        if (userId && userId !== assignment.userId) {
            const when = assignment.event.startTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            await notifyUsers({
                userIds: [userId],
                type: 'ASSIGNMENT',
                title: `You're on ${roleLabel(assignment.role, assignment.label)} duty`,
                body: `${assignment.event.title} on ${when} — ${assignment.event.team.name}`,
                link: '/schedule',
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: updated.id,
                role: updated.role,
                roleLabel: roleLabel(updated.role, updated.label),
                status: updated.status,
                userId: updated.userId,
                userName: updated.user?.name ?? null,
            },
        });
    } catch (error) {
        console.error('Update assignment error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update assignment' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const assignment = await prisma.eventAssignment.findUnique({
            where: { id },
            select: { event: { select: { teamId: true } } },
        });
        if (!assignment) {
            return NextResponse.json({ success: false, error: 'Assignment not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, assignment.event.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        await prisma.eventAssignment.delete({ where: { id } });
        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        console.error('Delete assignment error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete assignment' }, { status: 500 });
    }
}
