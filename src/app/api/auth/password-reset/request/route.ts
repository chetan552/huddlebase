import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { passwordResetEmail, sendEmail } from '@/lib/email';
import { appUrl, createSecureToken, hashToken } from '@/lib/tokens';

export async function POST(req: NextRequest) {
    try {
        const { email } = await req.json();
        if (!email) {
            return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { email },
            select: { id: true, email: true, name: true },
        });

        if (user) {
            const recentRequests = await prisma.passwordResetToken.count({
                where: {
                    userId: user.id,
                    createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) },
                },
            });

            if (recentRequests >= 3) {
                return NextResponse.json({
                    success: true,
                    message: 'If an account exists for that email, a reset link has been sent.',
                });
            }

            const token = createSecureToken();
            await prisma.$transaction([
                prisma.passwordResetToken.updateMany({
                    where: { userId: user.id, usedAt: null },
                    data: { usedAt: new Date() },
                }),
                prisma.passwordResetToken.create({
                    data: {
                        userId: user.id,
                        tokenHash: hashToken(token),
                        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                    },
                }),
            ]);

            await sendEmail({
                to: user.email,
                subject: 'Reset your HuddleBase password',
                html: passwordResetEmail({
                    name: user.name,
                    resetUrl: appUrl(`/reset-password?token=${token}`),
                }),
            });
        }

        return NextResponse.json({
            success: true,
            message: 'If an account exists for that email, a reset link has been sent.',
        });
    } catch (error) {
        console.error('Password reset request error:', error);
        return NextResponse.json({ success: false, error: 'Failed to request password reset' }, { status: 500 });
    }
}
