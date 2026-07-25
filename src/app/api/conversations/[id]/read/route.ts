import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { checkConversationAccess } from '@/lib/conversations';

/** Mark a conversation read up to now, clearing its unread badge. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { allowed } = await checkConversationAccess(user, id);
        if (!allowed) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const now = new Date();
        await prisma.conversationParticipant.updateMany({
            where: { conversationId: id, userId: user.id },
            data: { lastReadAt: now },
        });

        return NextResponse.json({ success: true, data: { lastReadAt: now.toISOString() } });
    } catch (error) {
        console.error('Mark read error:', error);
        return NextResponse.json({ success: false, error: 'Failed to mark as read' }, { status: 500 });
    }
}

/** Toggle mute for the caller, so a busy team channel can be silenced. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { allowed } = await checkConversationAccess(user, id);
        if (!allowed) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { muted } = await req.json();
        if (typeof muted !== 'boolean') {
            return NextResponse.json({ success: false, error: 'muted must be a boolean' }, { status: 400 });
        }

        await prisma.conversationParticipant.updateMany({
            where: { conversationId: id, userId: user.id },
            data: { mutedAt: muted ? new Date() : null },
        });

        return NextResponse.json({ success: true, data: { muted } });
    } catch (error) {
        console.error('Mute conversation error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update conversation' }, { status: 500 });
    }
}
