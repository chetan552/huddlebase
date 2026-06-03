import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import bcrypt from 'bcryptjs';
import { createSessionToken } from '@/lib/session';
import { decryptTwoFactorSecret, verifyAndConsumeRecoveryCode, verifyTotpCode } from '@/lib/twoFactor';

function buildSessionUser(user: { id: string; email: string; name: string; role: string; avatar: string | null }) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
    };
}

function createLoginResponse(sessionUser: ReturnType<typeof buildSessionUser>) {
    const token = createSessionToken(sessionUser);
    const response = NextResponse.json({ success: true, data: sessionUser, token });

    response.cookies.set('session', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
    });

    return response;
}

export async function POST(req: NextRequest) {
    try {
        const { email, password, twoFactorCode } = await req.json();

        if (!email || !password) {
            return NextResponse.json(
                { success: false, error: 'Email and password are required' },
                { status: 400 }
            );
        }

        // Find user
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
            return NextResponse.json(
                { success: false, error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        // Compare passwords
        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            return NextResponse.json(
                { success: false, error: 'Invalid email or password' },
                { status: 401 }
            );
        }

        const sessionUser = buildSessionUser(user);

        if (user.twoFactorEnabled) {
            if (!twoFactorCode) {
                return NextResponse.json({
                    success: false,
                    requiresTwoFactor: true,
                    error: 'Two-factor code is required',
                });
            }

            const code = String(twoFactorCode);
            let valid = false;
            let updatedRecoveryCodes: string | null = null;

            if (user.twoFactorSecret && /^\d[\d\s]*$/.test(code)) {
                valid = verifyTotpCode(decryptTwoFactorSecret(user.twoFactorSecret), code);
            }

            if (!valid) {
                updatedRecoveryCodes = verifyAndConsumeRecoveryCode(user.twoFactorRecoveryCodes, code);
                valid = updatedRecoveryCodes !== null;
            }

            if (!valid) {
                return NextResponse.json(
                    { success: false, requiresTwoFactor: true, error: 'Invalid two-factor code' },
                    { status: 401 }
                );
            }

            if (updatedRecoveryCodes !== null) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { twoFactorRecoveryCodes: updatedRecoveryCodes },
                });
            }
        }

        return createLoginResponse(sessionUser);
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json(
            { success: false, error: 'Login failed' },
            { status: 500 }
        );
    }
}
