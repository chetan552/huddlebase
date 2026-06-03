import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { decryptTwoFactorSecret, verifyTotpCode } from '@/lib/twoFactor';

export async function POST(req: NextRequest) {
    try {
        const sessionUser = getSessionUser(req);
        if (!sessionUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { password, code } = await req.json();
        if (!password || !code) {
            return NextResponse.json({ success: false, error: 'Password and two-factor code are required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
        }

        if (!user.twoFactorEnabled || !user.twoFactorSecret) {
            return NextResponse.json({ success: false, error: 'Two-factor authentication is not enabled' }, { status: 400 });
        }

        const validCode = verifyTotpCode(decryptTwoFactorSecret(user.twoFactorSecret), String(code));
        if (!validCode) {
            return NextResponse.json({ success: false, error: 'Invalid two-factor code' }, { status: 400 });
        }

        await prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorEnabled: false,
                twoFactorSecret: null,
                twoFactorRecoveryCodes: null,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('2FA disable error:', error);
        return NextResponse.json({ success: false, error: 'Failed to disable two-factor authentication' }, { status: 500 });
    }
}
