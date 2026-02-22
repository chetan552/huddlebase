import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const unreadOnly = searchParams.get('unread') === 'true';

        const notifications = await prisma.notification.findMany({
            where: {
                userId: user.id,
                ...(unreadOnly ? { read: false } : {}),
            },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });

        const unreadCount = await prisma.notification.count({
            where: { userId: user.id, read: false },
        });

        return NextResponse.json({ success: true, data: notifications, unreadCount });
    } catch (error) {
        console.error('Fetch notifications error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch notifications' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { ids, markAll } = await req.json();

        if (markAll) {
            await prisma.notification.updateMany({
                where: { userId: user.id, read: false },
                data: { read: true },
            });
        } else if (ids?.length) {
            await prisma.notification.updateMany({
                where: { id: { in: ids }, userId: user.id },
                data: { read: true },
            });
        }

        const unreadCount = await prisma.notification.count({
            where: { userId: user.id, read: false },
        });

        return NextResponse.json({ success: true, unreadCount });
    } catch (error) {
        console.error('Update notifications error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update notifications' }, { status: 500 });
    }
}
