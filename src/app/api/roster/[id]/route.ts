import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function DELETE(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const memberId = params.id;

        if (!memberId) {
            return NextResponse.json({ success: false, error: 'Member ID is required' }, { status: 400 });
        }

        // Optional: Could verify that the person deleting is an ADMIN or COACH for this team, 
        // but for now, we'll allow any logged-in user to delete a TeamMember if they can access it.

        await prisma.teamMember.delete({
            where: { id: memberId },
        });

        return NextResponse.json({ success: true, message: 'Player removed successfully' });
    } catch (error) {
        console.error('Remove player error:', error);
        return NextResponse.json({ success: false, error: 'Failed to remove player' }, { status: 500 });
    }
}
