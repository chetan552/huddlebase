import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { hashToken } from '@/lib/tokens';

export async function POST(req: NextRequest) {
    try {
        const { token, password } = await req.json();
        if (!token || !password) {
            return NextResponse.json({ success: false, error: 'Token and password are required' }, { status: 400 });
        }
        if (password.length < 8) {
            return NextResponse.json({ success: false, error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        const resetToken = await prisma.passwordResetToken.findUnique({
            where: { tokenHash: hashToken(token) },
        });

        if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
            return NextResponse.json({ success: false, error: 'Reset link is invalid or expired' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await prisma.$transaction([
            prisma.user.update({
                where: { id: resetToken.userId },
                data: { password: hashedPassword },
            }),
            prisma.passwordResetToken.update({
                where: { id: resetToken.id },
                data: { usedAt: new Date() },
            }),
        ]);

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Password reset confirm error:', error);
        return NextResponse.json({ success: false, error: 'Failed to reset password' }, { status: 500 });
    }
}
