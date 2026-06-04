import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { buildSessionUser, setSessionCookie } from '@/lib/authResponse';
import { createSessionToken } from '@/lib/session';

export async function PATCH(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { name, avatar, phone } = await req.json();
        const trimmedName = typeof name === 'string' ? name.trim() : undefined;

        if (name !== undefined && !trimmedName) {
            return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
        }

        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                ...(trimmedName ? { name: trimmedName } : {}),
                ...(avatar !== undefined ? { avatar } : {}),
                ...(phone !== undefined ? { phone } : {}),
            },
            select: { id: true, name: true, email: true, role: true, coachApproved: true, avatar: true, phone: true },
        });

        const response = NextResponse.json({ success: true, data: updated });
        setSessionCookie(response, createSessionToken(buildSessionUser(updated)));
        return response;
    } catch (error) {
        console.error('Update profile error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update profile' }, { status: 500 });
    }
}
