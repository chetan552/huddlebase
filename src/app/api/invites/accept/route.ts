import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { hashToken } from '@/lib/tokens';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/passwordPolicy';

export async function POST(req: NextRequest) {
    try {
        const { token, password, name } = await req.json();
        if (!token || !password) {
            return NextResponse.json({ success: false, error: 'Token and password are required' }, { status: 400 });
        }
        if (!isStrongPassword(password)) {
            return NextResponse.json({ success: false, error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
        }

        const invite = await prisma.teamInvite.findUnique({
            where: { tokenHash: hashToken(token) },
            include: { user: true },
        });

        if (!invite || invite.acceptedAt || invite.expiresAt < new Date()) {
            return NextResponse.json({ success: false, error: 'Invite is invalid or expired' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const existingUser = invite.user || await prisma.user.findUnique({ where: { email: invite.email } });

        if (!existingUser) {
            return NextResponse.json({ success: false, error: 'Invited account was not found' }, { status: 404 });
        }

        await prisma.$transaction([
            prisma.user.update({
                where: { id: existingUser.id },
                data: {
                    password: hashedPassword,
                    ...(typeof name === 'string' && name.trim() ? { name: name.trim() } : {}),
                },
            }),
            prisma.teamInvite.update({
                where: { id: invite.id },
                data: { acceptedAt: new Date(), userId: existingUser.id },
            }),
        ]);

        return NextResponse.json({ success: true, email: existingUser.email });
    } catch (error) {
        console.error('Accept invite error:', error);
        return NextResponse.json({ success: false, error: 'Failed to accept invite' }, { status: 500 });
    }
}
