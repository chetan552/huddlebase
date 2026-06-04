import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isApprovedCoachOrAdmin } from '@/lib/permissions';
import { writeAuditLog } from '@/lib/audit';

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
