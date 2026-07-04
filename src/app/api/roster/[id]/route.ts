import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id: memberId } = await params;

        if (!memberId) {
            return NextResponse.json({ success: false, error: 'Member ID is required' }, { status: 400 });
        }

        const member = await prisma.teamMember.findUnique({
            where: { id: memberId },
            select: { teamId: true },
        });
        if (!member) {
            return NextResponse.json({ success: false, error: 'Member not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, member.teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can remove members' }, { status: 403 });
        }

        await prisma.teamMember.delete({
            where: { id: memberId },
        });

        return NextResponse.json({ success: true, message: 'Player removed successfully' });
    } catch (error) {
        console.error('Remove player error:', error);
        return NextResponse.json({ success: false, error: 'Failed to remove player' }, { status: 500 });
    }
}
