import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function PATCH(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { name, avatar, phone } = await req.json();

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                ...(name ? { name } : {}),
                ...(avatar !== undefined ? { avatar } : {}),
                ...(phone !== undefined ? { phone } : {}),
            },
            select: { id: true, name: true, email: true, role: true, avatar: true, phone: true },
        });

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
    }
}
