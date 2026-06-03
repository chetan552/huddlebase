import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
    try {
        const sessionUser = getSessionUser(req);
        if (!sessionUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: { twoFactorEnabled: true, twoFactorRecoveryCodes: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const recoveryCodesRemaining = user.twoFactorRecoveryCodes
            ? (JSON.parse(user.twoFactorRecoveryCodes) as string[]).length
            : 0;

        return NextResponse.json({
            success: true,
            data: {
                enabled: user.twoFactorEnabled,
                recoveryCodesRemaining,
            },
        });
    } catch (error) {
        console.error('2FA status error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load two-factor status' }, { status: 500 });
    }
}
