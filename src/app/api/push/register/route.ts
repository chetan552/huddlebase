import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isExpoPushToken } from '@/lib/push';

/**
 * Device push-token registration for the mobile app.
 *
 * The app calls POST on every launch. Tokens are stable but can be reassigned to a
 * different user on a shared device, so an existing token row is reclaimed rather
 * than rejected — otherwise a family sharing an iPad would send one member's alerts
 * to the other.
 */

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { token, platform, deviceName } = await req.json();

        if (!token || typeof token !== 'string' || !isExpoPushToken(token)) {
            return NextResponse.json({ success: false, error: 'A valid Expo push token is required' }, { status: 400 });
        }

        const normalisedPlatform = platform === 'android' ? 'android' : 'ios';

        const record = await prisma.pushToken.upsert({
            where: { token: token.trim() },
            create: {
                token: token.trim(),
                userId: user.id,
                platform: normalisedPlatform,
                deviceName: typeof deviceName === 'string' ? deviceName.slice(0, 120) : null,
            },
            update: {
                userId: user.id,
                platform: normalisedPlatform,
                ...(typeof deviceName === 'string' && { deviceName: deviceName.slice(0, 120) }),
                lastUsedAt: new Date(),
                failureCount: 0,
            },
            select: { id: true, platform: true, createdAt: true },
        });

        return NextResponse.json({ success: true, data: record }, { status: 201 });
    } catch (error) {
        console.error('Push register error:', error);
        return NextResponse.json({ success: false, error: 'Failed to register device' }, { status: 500 });
    }
}

/** Called on sign-out so a shared device stops receiving the previous user's alerts. */
export async function DELETE(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const token = searchParams.get('token');

        if (!token) {
            return NextResponse.json({ success: false, error: 'token is required' }, { status: 400 });
        }

        // Scoped to the caller so a token cannot be deregistered by another account.
        const deleted = await prisma.pushToken.deleteMany({
            where: { token, userId: user.id },
        });

        return NextResponse.json({ success: true, data: { removed: deleted.count } });
    } catch (error) {
        console.error('Push deregister error:', error);
        return NextResponse.json({ success: false, error: 'Failed to remove device' }, { status: 500 });
    }
}
