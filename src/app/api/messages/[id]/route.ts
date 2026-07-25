import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { checkConversationAccess } from '@/lib/conversations';
import { isTeamStaff } from '@/lib/permissions';

const MAX_LENGTH = 4000;
/** Emoji only, so the reaction column can't be used to store arbitrary text. */
const EMOJI_PATTERN = /^\p{Extended_Pictographic}(‍\p{Extended_Pictographic})*\p{Emoji_Modifier}?$/u;

/** Edit your own message. */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const message = await prisma.message.findUnique({
            where: { id },
            select: { id: true, senderId: true, conversationId: true, deletedAt: true },
        });

        if (!message || message.deletedAt) {
            return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
        }
        if (message.senderId !== user.id) {
            return NextResponse.json({ success: false, error: 'You can only edit your own messages' }, { status: 403 });
        }

        const { content } = await req.json();
        const trimmed = typeof content === 'string' ? content.trim() : '';
        if (!trimmed) {
            return NextResponse.json({ success: false, error: 'Message cannot be empty' }, { status: 400 });
        }
        if (trimmed.length > MAX_LENGTH) {
            return NextResponse.json({ success: false, error: `Messages are limited to ${MAX_LENGTH} characters` }, { status: 400 });
        }

        const updated = await prisma.message.update({
            where: { id },
            data: { content: trimmed, editedAt: new Date() },
            select: { id: true, content: true, editedAt: true },
        });

        return NextResponse.json({
            success: true,
            data: { ...updated, editedAt: updated.editedAt?.toISOString() ?? null },
        });
    } catch (error) {
        console.error('Edit message error:', error);
        return NextResponse.json({ success: false, error: 'Failed to edit message' }, { status: 500 });
    }
}

/**
 * Soft-delete a message. The sender can always remove their own; team staff can
 * moderate anything in their team's channel.
 */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const message = await prisma.message.findUnique({
            where: { id },
            select: { id: true, senderId: true, teamId: true, deletedAt: true },
        });

        if (!message || message.deletedAt) {
            return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
        }

        const isAuthor = message.senderId === user.id;
        const canModerate = message.teamId ? await isTeamStaff(user, message.teamId) : false;

        if (!isAuthor && !canModerate) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Soft delete keeps thread replies anchored and preserves the moderation trail.
        await prisma.message.update({
            where: { id },
            data: { deletedAt: new Date(), content: '' },
        });

        return NextResponse.json({ success: true, data: { id } });
    } catch (error) {
        console.error('Delete message error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete message' }, { status: 500 });
    }
}

/** Toggle a reaction on a message. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { emoji } = await req.json();

        if (typeof emoji !== 'string' || !EMOJI_PATTERN.test(emoji)) {
            return NextResponse.json({ success: false, error: 'A single emoji is required' }, { status: 400 });
        }

        const message = await prisma.message.findUnique({
            where: { id },
            select: { conversationId: true, deletedAt: true },
        });
        if (!message || message.deletedAt) {
            return NextResponse.json({ success: false, error: 'Message not found' }, { status: 404 });
        }

        const { allowed } = await checkConversationAccess(user, message.conversationId);
        if (!allowed) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const existing = await prisma.messageReaction.findUnique({
            where: { messageId_userId_emoji: { messageId: id, userId: user.id, emoji } },
            select: { id: true },
        });

        if (existing) {
            await prisma.messageReaction.delete({ where: { id: existing.id } });
            return NextResponse.json({ success: true, data: { emoji, reacted: false } });
        }

        await prisma.messageReaction.create({
            data: { messageId: id, userId: user.id, emoji },
        });

        return NextResponse.json({ success: true, data: { emoji, reacted: true } }, { status: 201 });
    } catch (error) {
        console.error('React to message error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update reaction' }, { status: 500 });
    }
}
