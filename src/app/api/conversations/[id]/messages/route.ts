import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { checkConversationAccess } from '@/lib/conversations';
import { notifyUsers } from '@/lib/notify';
import { newMessageEmail } from '@/lib/email';

const PAGE_SIZE = 50;
const MAX_LENGTH = 4000;

interface Attachment {
    url: string;
    name?: string;
    type?: string;
    size?: number;
}

function parseAttachments(input: unknown): Attachment[] {
    if (!Array.isArray(input)) return [];
    return input
        .filter((a): a is Attachment => Boolean(a) && typeof (a as Attachment).url === 'string')
        .slice(0, 10)
        .map((a) => ({
            url: String(a.url),
            name: a.name ? String(a.name).slice(0, 200) : undefined,
            type: a.type ? String(a.type).slice(0, 60) : undefined,
            size: typeof a.size === 'number' ? a.size : undefined,
        }));
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

        const { searchParams } = new URL(req.url);
        const before = searchParams.get('before');

        const messages = await prisma.message.findMany({
            where: {
                conversationId: id,
                ...(before && { createdAt: { lt: new Date(before) } }),
            },
            include: {
                sender: { select: { id: true, name: true, avatar: true } },
                reactions: { select: { emoji: true, userId: true } },
            },
            // Newest-first with a limit, then reversed: paging backwards through history
            // without loading the whole thread.
            orderBy: { createdAt: 'desc' },
            take: PAGE_SIZE,
        });

        // Who else has caught up, for read receipts on your own messages.
        const participants = await prisma.conversationParticipant.findMany({
            where: { conversationId: id, userId: { not: user.id } },
            select: { userId: true, lastReadAt: true, user: { select: { name: true } } },
        });

        const data = messages.reverse().map((m) => {
            const readBy = participants
                .filter((p) => p.lastReadAt && p.lastReadAt >= m.createdAt)
                .map((p) => ({ id: p.userId, name: p.user.name }));

            const grouped = new Map<string, string[]>();
            for (const r of m.reactions) {
                if (!grouped.has(r.emoji)) grouped.set(r.emoji, []);
                grouped.get(r.emoji)!.push(r.userId);
            }

            return {
                id: m.id,
                content: m.deletedAt ? null : m.content,
                deleted: Boolean(m.deletedAt),
                senderId: m.senderId,
                senderName: m.sender.name,
                senderAvatar: m.sender.avatar,
                attachments: m.attachments ? JSON.parse(m.attachments) : [],
                threadId: m.threadId,
                editedAt: m.editedAt?.toISOString() ?? null,
                createdAt: m.createdAt.toISOString(),
                reactions: Array.from(grouped.entries()).map(([emoji, userIds]) => ({
                    emoji,
                    count: userIds.length,
                    reacted: userIds.includes(user.id),
                })),
                readBy,
            };
        });

        return NextResponse.json({
            success: true,
            data,
            meta: { hasMore: messages.length === PAGE_SIZE },
        });
    } catch (error) {
        console.error('Fetch messages error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch messages' }, { status: 500 });
    }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { allowed, conversation, participantIds } = await checkConversationAccess(user, id);
        if (!allowed || !conversation) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const { content, threadId, attachments } = await req.json();
        const trimmed = typeof content === 'string' ? content.trim() : '';
        const parsedAttachments = parseAttachments(attachments);

        if (!trimmed && parsedAttachments.length === 0) {
            return NextResponse.json({ success: false, error: 'Message cannot be empty' }, { status: 400 });
        }
        if (trimmed.length > MAX_LENGTH) {
            return NextResponse.json({ success: false, error: `Messages are limited to ${MAX_LENGTH} characters` }, { status: 400 });
        }

        const message = await prisma.message.create({
            data: {
                conversationId: id,
                teamId: conversation.teamId,
                senderId: user.id,
                content: trimmed,
                threadId: threadId || null,
                attachments: parsedAttachments.length > 0 ? JSON.stringify(parsedAttachments) : null,
            },
            include: { sender: { select: { id: true, name: true, avatar: true } } },
        });

        await prisma.$transaction([
            prisma.conversation.update({
                where: { id },
                data: { lastMessageAt: message.createdAt },
            }),
            // The sender has by definition read their own message.
            prisma.conversationParticipant.updateMany({
                where: { conversationId: id, userId: user.id },
                data: { lastReadAt: message.createdAt },
            }),
        ]);

        const recipients = participantIds.filter((pid) => pid !== user.id);
        if (recipients.length > 0) {
            const muted = await prisma.conversationParticipant.findMany({
                where: { conversationId: id, userId: { in: recipients }, mutedAt: { not: null } },
                select: { userId: true },
            });
            const mutedIds = new Set(muted.map((m) => m.userId));
            const active = recipients.filter((pid) => !mutedIds.has(pid));

            if (active.length > 0) {
                const label =
                    conversation.type === 'DIRECT'
                        ? user.name
                        : conversation.name || 'your team';
                const preview = trimmed || `${parsedAttachments.length} attachment(s)`;

                await notifyUsers({
                    userIds: active,
                    type: 'NEW_MESSAGE',
                    title:
                        conversation.type === 'DIRECT'
                            ? `Message from ${user.name}`
                            : `New message in ${label}`,
                    body: `${user.name}: ${preview.slice(0, 100)}`,
                    link: `/chat?conversation=${id}`,
                    data: { conversationId: id },
                    // Direct messages are personal enough to warrant an email; team
                    // chatter would be spam, so it stays in-app and on push.
                    ...(conversation.type === 'DIRECT' && {
                        emailSubject: `New message from ${user.name}`,
                        emailHtml: newMessageEmail({
                            teamName: label,
                            senderName: user.name,
                            messagePreview: preview.slice(0, 150),
                        }),
                    }),
                });
            }
        }

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: message.id,
                    content: message.content,
                    senderId: message.senderId,
                    senderName: message.sender.name,
                    senderAvatar: message.sender.avatar,
                    attachments: parsedAttachments,
                    threadId: message.threadId,
                    createdAt: message.createdAt.toISOString(),
                    reactions: [],
                    readBy: [],
                },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('Send message error:', error);
        return NextResponse.json({ success: false, error: 'Failed to send message' }, { status: 500 });
    }
}
