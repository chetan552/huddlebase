import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember } from '@/lib/permissions';
import { getOrCreateTeamConversation } from '@/lib/conversations';
import { notifyUsers } from '@/lib/notify';

/**
 * Team-channel messaging, addressed by teamId.
 *
 * Superseded by /api/conversations/[id]/messages, which also covers direct and group
 * threads. This route stays because the existing web chat page and the shipped
 * mobile build call it; it now reads and writes the team's TEAM conversation so both
 * APIs see the same messages.
 */

const MAX_LENGTH = 4000;

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get('teamId');

        if (!teamId) {
            return NextResponse.json({ success: false, error: 'teamId is required' }, { status: 400 });
        }
        if (!(await isTeamMember(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const conversationId = await getOrCreateTeamConversation(teamId);

        const messages = await prisma.message.findMany({
            where: { conversationId, deletedAt: null },
            include: { sender: { select: { id: true, name: true, avatar: true } } },
            orderBy: { createdAt: 'asc' },
            take: 100,
        });

        const data = messages.map((m) => ({
            id: m.id,
            content: m.content,
            senderName: m.sender.name,
            senderId: m.sender.id,
            senderAvatar: m.sender.avatar,
            attachments: m.attachments ? JSON.parse(m.attachments) : [],
            createdAt: m.createdAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data, meta: { conversationId } });
    } catch (error) {
        console.error('Fetch messages error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId, content } = await req.json();

        if (!teamId || !content?.trim()) {
            return NextResponse.json({ success: false, error: 'teamId and content are required' }, { status: 400 });
        }
        if (content.trim().length > MAX_LENGTH) {
            return NextResponse.json({ success: false, error: `Messages are limited to ${MAX_LENGTH} characters` }, { status: 400 });
        }
        if (!(await isTeamMember(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const conversationId = await getOrCreateTeamConversation(teamId);
        const trimmed = content.trim();

        const message = await prisma.message.create({
            data: { conversationId, teamId, senderId: user.id, content: trimmed },
            include: {
                sender: { select: { id: true, name: true, avatar: true } },
                team: { select: { name: true } },
            },
        });

        await prisma.$transaction([
            prisma.conversation.update({
                where: { id: conversationId },
                data: { lastMessageAt: message.createdAt },
            }),
            prisma.conversationParticipant.updateMany({
                where: { conversationId, userId: user.id },
                data: { lastReadAt: message.createdAt },
            }),
        ]);

        // Everyone in the channel except the sender and anyone who muted it.
        const participants = await prisma.conversationParticipant.findMany({
            where: { conversationId, userId: { not: user.id }, mutedAt: null },
            select: { userId: true },
        });

        if (participants.length > 0) {
            await notifyUsers({
                userIds: participants.map((p) => p.userId),
                type: 'NEW_MESSAGE',
                title: `New message in ${message.team?.name ?? 'your team'}`,
                body: `${user.name}: ${trimmed.slice(0, 100)}`,
                link: `/chat?conversation=${conversationId}`,
                data: { conversationId, teamId },
            });
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: message.id,
                    content: message.content,
                    senderName: message.sender.name,
                    senderId: message.sender.id,
                    senderAvatar: message.sender.avatar,
                    createdAt: message.createdAt.toISOString(),
                },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('Send message error:', error);
        return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
    }
}
