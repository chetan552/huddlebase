import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import {
    createRecoveryCodes,
    decryptTwoFactorSecret,
    hashRecoveryCode,
    verifyTotpCode,
} from '@/lib/twoFactor';

export async function POST(req: NextRequest) {
    try {
        const sessionUser = getSessionUser(req);
        if (!sessionUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { code } = await req.json();
        if (!code) {
            return NextResponse.json({ success: false, error: 'Verification code is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: { id: true, twoFactorSecret: true },
        });

        if (!user?.twoFactorSecret) {
            return NextResponse.json({ success: false, error: 'Two-factor setup has not been started' }, { status: 400 });
        }

        const secret = decryptTwoFactorSecret(user.twoFactorSecret);
        if (!verifyTotpCode(secret, String(code))) {
            return NextResponse.json({ success: false, error: 'Invalid verification code' }, { status: 400 });
        }

        const recoveryCodes = createRecoveryCodes();
        await prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorEnabled: true,
                twoFactorRecoveryCodes: JSON.stringify(recoveryCodes.map(hashRecoveryCode)),
            },
        });

        return NextResponse.json({
            success: true,
            data: { recoveryCodes },
        });
    } catch (error) {
        console.error('2FA verify error:', error);
        return NextResponse.json({ success: false, error: 'Failed to enable two-factor authentication' }, { status: 500 });
    }
}
