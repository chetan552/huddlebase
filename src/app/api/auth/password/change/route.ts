import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/passwordPolicy';

export async function POST(req: NextRequest) {
    try {
        const sessionUser = getSessionUser(req);
        if (!sessionUser) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { currentPassword, newPassword } = await req.json();
        if (!currentPassword || !newPassword) {
            return NextResponse.json({ success: false, error: 'Current password and new password are required' }, { status: 400 });
        }

        if (!isStrongPassword(newPassword)) {
            return NextResponse.json({ success: false, error: PASSWORD_POLICY_MESSAGE }, { status: 400 });
        }

        const user = await prisma.user.findUnique({
            where: { id: sessionUser.id },
            select: { id: true, password: true },
        });

        if (!user) {
            return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
        }

        const validCurrentPassword = await bcrypt.compare(currentPassword, user.password);
        if (!validCurrentPassword) {
            return NextResponse.json({ success: false, error: 'Current password is incorrect' }, { status: 401 });
        }

        const samePassword = await bcrypt.compare(newPassword, user.password);
        if (samePassword) {
            return NextResponse.json({ success: false, error: 'New password must be different from your current password' }, { status: 400 });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prisma.$transaction([
            prisma.user.update({
                where: { id: user.id },
                data: { password: hashedPassword },
            }),
            prisma.passwordResetToken.updateMany({
                where: { userId: user.id, usedAt: null },
                data: { usedAt: new Date() },
            }),
        ]);

        return NextResponse.json({ success: true, message: 'Password updated successfully.' });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update password' }, { status: 500 });
    }
}
