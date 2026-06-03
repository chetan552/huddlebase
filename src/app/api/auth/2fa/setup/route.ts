import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { createOtpAuthUrl, createTwoFactorSecret, encryptTwoFactorSecret } from '@/lib/twoFactor';

export async function POST(req: NextRequest) {
    try {
        const sessionUser = getSessionUser(req);
        if (!sessionUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { password } = await req.json();
        if (!password) {
            return NextResponse.json({ success: false, error: 'Password is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }
        if (user.twoFactorEnabled) {
            return NextResponse.json({ success: false, error: 'Two-factor authentication is already enabled' }, { status: 400 });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
        }

        const secret = createTwoFactorSecret();
        await prisma.user.update({
            where: { id: user.id },
            data: {
                twoFactorSecret: encryptTwoFactorSecret(secret),
                twoFactorEnabled: false,
                twoFactorRecoveryCodes: null,
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                secret,
                otpauthUrl: createOtpAuthUrl({
                    issuer: 'HuddleBase',
                    account: user.email,
                    secret,
                }),
            },
        });
    } catch (error) {
        console.error('2FA setup error:', error);
        return NextResponse.json({ success: false, error: 'Failed to start two-factor setup' }, { status: 500 });
    }
}
