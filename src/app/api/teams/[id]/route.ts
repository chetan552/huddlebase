import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isApprovedCoachOrAdmin, isTeamStaff } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';
import { isValidTimeZone } from '@/lib/timezone';

/**
 * Update team settings.
 *
 * Timezone matters most here: event start times are entered as wall-clock time and
 * interpreted against this zone, so a team that sets it wrong will see every event
 * shift. Changing it does not move existing events — they keep the UTC instant they
 * were saved with.
 */
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id: teamId } = await params;
        if (!(await isTeamStaff(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can update the team' }, { status: 403 });
        }

        const { name, sport, season, color, timezone } = await req.json();

        if (timezone !== undefined && !isValidTimeZone(timezone)) {
            return NextResponse.json({ success: false, error: 'Invalid timezone' }, { status: 400 });
        }
        if (name !== undefined && !String(name).trim()) {
            return NextResponse.json({ success: false, error: 'Name cannot be empty' }, { status: 400 });
        }

        const team = await prisma.team.update({
            where: { id: teamId },
            data: {
                ...(name !== undefined && { name: String(name).trim() }),
                ...(sport !== undefined && { sport }),
                ...(season !== undefined && { season: season || null }),
                ...(color !== undefined && { color }),
                ...(timezone !== undefined && { timezone }),
            },
            select: { id: true, name: true, sport: true, season: true, color: true, timezone: true },
        });

        return NextResponse.json({ success: true, data: team });
    } catch (error) {
        console.error('Update team error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update team' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user || !isApprovedCoachOrAdmin(user)) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Staff only.' }, { status: 403 });
        }

        const { id: teamId } = await params;
        if (!teamId) {
            return NextResponse.json({ success: false, error: 'Team ID is required' }, { status: 400 });
        }

        // Verify the user has access to delete this team (they are a member of it)
        const teamMember = await prisma.teamMember.findFirst({
            where: {
                teamId,
                userId: user.id,
                role: { in: ['COACH', 'ADMIN', 'MANAGER'] }
            }
        });

        if (!teamMember && user.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'You do not have permission to delete this team.' }, { status: 403 });
        }

        const deleted = await prisma.team.delete({
            where: { id: teamId }
        });

        if (user.role === 'ADMIN') {
            await writeAuditLog({
                actor: user,
                action: 'admin.team.delete',
                targetType: 'Team',
                targetId: deleted.id,
                targetLabel: deleted.name,
            });
        }

        return NextResponse.json({ success: true, message: 'Team deleted successfully' });
    } catch (error: any) {
        console.error('Delete team error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete team', details: String(error?.message || error) }, { status: 500 });
    }
}
