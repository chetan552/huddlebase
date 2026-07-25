import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember } from '@/lib/permissions';
import {
    getOrCreateTeamConversation,
    getOrCreateDirectConversation,
    findSharedTeamUserIds,
} from '@/lib/conversations';

const MAX_GROUP_PARTICIPANTS = 50;

/** List the caller's conversations with unread counts and a preview of the last message. */
export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        // Make sure a channel exists for every team the user is on, so the list isn't
        // empty for a team that has never been messaged in.
        const memberships = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { teamId: true },
        });
        await Promise.all(memberships.map((m) => getOrCreateTeamConversation(m.teamId)));

        const participantRows = await prisma.conversationParticipant.findMany({
            where: { userId: user.id },
            include: {
                conversation: {
                    include: {
                        team: { select: { id: true, name: true, color: true } },
                        participants: {
                            include: { user: { select: { id: true, name: true, avatar: true } } },
                        },
                        messages: {
                            where: { deletedAt: null },
                            orderBy: { createdAt: 'desc' },
                            take: 1,
                            include: { sender: { select: { id: true, name: true } } },
                        },
                    },
                },
            },
        });

        // Unread counts in one grouped query rather than one per conversation.
        const unreadCounts = await Promise.all(
            participantRows.map(async (row) => {
                const count = await prisma.message.count({
                    where: {
                        conversationId: row.conversationId,
                        deletedAt: null,
                        senderId: { not: user.id },
                        ...(row.lastReadAt && { createdAt: { gt: row.lastReadAt } }),
                    },
                });
                return [row.conversationId, count] as const;
            }),
        );
        const unreadByConversation = new Map(unreadCounts);

        const data = participantRows
            .map((row) => {
                const c = row.conversation;
                const others = c.participants.filter((p) => p.userId !== user.id);
                const last = c.messages[0] ?? null;

                // TEAM and DIRECT derive their title; only GROUP carries an explicit name.
                let title = c.name;
                if (c.type === 'TEAM') title = c.team?.name ?? 'Team';
                if (c.type === 'DIRECT') title = others[0]?.user.name ?? 'Direct message';

                return {
                    id: c.id,
                    type: c.type,
                    title,
                    teamId: c.teamId,
                    teamName: c.team?.name ?? null,
                    teamColor: c.team?.color ?? null,
                    participants: c.participants.map((p) => ({
                        id: p.user.id,
                        name: p.user.name,
                        avatar: p.user.avatar,
                    })),
                    unreadCount: unreadByConversation.get(c.id) ?? 0,
                    muted: Boolean(row.mutedAt),
                    lastMessage: last
                        ? {
                              id: last.id,
                              content: last.content.slice(0, 140),
                              senderId: last.senderId,
                              senderName: last.sender.name,
                              createdAt: last.createdAt.toISOString(),
                          }
                        : null,
                    lastMessageAt: (c.lastMessageAt ?? c.createdAt).toISOString(),
                };
            })
            // Most recently active first; never-used channels sort by creation.
            .sort((a, b) => b.lastMessageAt.localeCompare(a.lastMessageAt));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Fetch conversations error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch conversations' }, { status: 500 });
    }
}

/** Open a direct thread or create a named group chat. */
export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { type, userId, userIds, name, teamId } = await req.json();

        if (type === 'DIRECT') {
            if (!userId || typeof userId !== 'string') {
                return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
            }
            if (userId === user.id) {
                return NextResponse.json({ success: false, error: 'Cannot message yourself' }, { status: 400 });
            }

            // Only people who share a team, so this can't be used to reach any account.
            const shared = await findSharedTeamUserIds(user.id, [userId]);
            if (!shared.has(userId)) {
                return NextResponse.json(
                    { success: false, error: 'You can only message people on your teams' },
                    { status: 403 },
                );
            }

            const id = await getOrCreateDirectConversation(user.id, userId, teamId || null);
            return NextResponse.json({ success: true, data: { id, type: 'DIRECT' } }, { status: 201 });
        }

        if (type === 'GROUP') {
            if (!name?.trim()) {
                return NextResponse.json({ success: false, error: 'Group name is required' }, { status: 400 });
            }
            if (!Array.isArray(userIds) || userIds.length === 0) {
                return NextResponse.json({ success: false, error: 'Select at least one member' }, { status: 400 });
            }
            if (userIds.length > MAX_GROUP_PARTICIPANTS) {
                return NextResponse.json(
                    { success: false, error: `Groups are limited to ${MAX_GROUP_PARTICIPANTS} members` },
                    { status: 400 },
                );
            }
            if (teamId && !(await isTeamMember(user, teamId))) {
                return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
            }

            const candidates = userIds.filter((id: unknown): id is string => typeof id === 'string' && id !== user.id);
            const shared = await findSharedTeamUserIds(user.id, candidates);
            const members = candidates.filter((id) => shared.has(id));

            if (members.length === 0) {
                return NextResponse.json(
                    { success: false, error: 'None of those people share a team with you' },
                    { status: 403 },
                );
            }

            const conversation = await prisma.conversation.create({
                data: {
                    type: 'GROUP',
                    name: name.trim().slice(0, 80),
                    teamId: teamId || null,
                    createdById: user.id,
                    participants: {
                        create: [user.id, ...members].map((id) => ({ userId: id })),
                    },
                },
                select: { id: true },
            });

            return NextResponse.json(
                { success: true, data: { id: conversation.id, type: 'GROUP' } },
                { status: 201 },
            );
        }

        return NextResponse.json({ success: false, error: 'type must be DIRECT or GROUP' }, { status: 400 });
    } catch (error) {
        console.error('Create conversation error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create conversation' }, { status: 500 });
    }
}
