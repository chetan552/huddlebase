/**
 * Conversation resolution and access control.
 *
 * Every message lives in a conversation. Teams keep their broadcast channel (one
 * TEAM conversation per team, auto-created and auto-joined), and members can also
 * open DIRECT threads or named GROUP chats that don't reach the whole roster.
 */

import prisma from './db';
import type { SessionUser } from './session';

export const CONVERSATION_TYPES = ['TEAM', 'DIRECT', 'GROUP'] as const;
export type ConversationType = (typeof CONVERSATION_TYPES)[number];

export function teamLookupKey(teamId: string): string {
    return `team:${teamId}`;
}

/** Order-independent key so (A,B) and (B,A) resolve to the same conversation. */
export function directLookupKey(userIds: string[]): string {
    return `direct:${Array.from(new Set(userIds)).sort().join(',')}`;
}

/**
 * The team's broadcast conversation, created on first use.
 *
 * Uses an upsert on `lookupKey` so two simultaneous senders can't create duplicate
 * channels for the same team.
 */
export async function getOrCreateTeamConversation(teamId: string): Promise<string> {
    const conversation = await prisma.conversation.upsert({
        where: { lookupKey: teamLookupKey(teamId) },
        create: {
            teamId,
            type: 'TEAM',
            lookupKey: teamLookupKey(teamId),
        },
        update: {},
        select: { id: true },
    });

    // Keep participants in step with the roster: members added to the team after the
    // channel was created still need a row for unread tracking.
    const [members, existing] = await Promise.all([
        prisma.teamMember.findMany({ where: { teamId }, select: { userId: true } }),
        prisma.conversationParticipant.findMany({
            where: { conversationId: conversation.id },
            select: { userId: true },
        }),
    ]);

    const present = new Set(existing.map((p) => p.userId));
    const missing = members.filter((m) => !present.has(m.userId));

    if (missing.length > 0) {
        await prisma.conversationParticipant.createMany({
            data: missing.map((m) => ({ conversationId: conversation.id, userId: m.userId })),
            skipDuplicates: true,
        });
    }

    return conversation.id;
}

export interface ConversationAccess {
    allowed: boolean;
    conversation: {
        id: string;
        teamId: string | null;
        type: string;
        name: string | null;
    } | null;
    /** Everyone who should be notified about a new message here. */
    participantIds: string[];
}

/**
 * Check whether a user may read and post in a conversation.
 *
 * TEAM conversations fall back to team membership so a member who predates the
 * channel isn't locked out before their participant row is backfilled.
 */
export async function checkConversationAccess(
    user: SessionUser,
    conversationId: string,
): Promise<ConversationAccess> {
    const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        select: {
            id: true,
            teamId: true,
            type: true,
            name: true,
            participants: { select: { userId: true } },
        },
    });

    if (!conversation) {
        return { allowed: false, conversation: null, participantIds: [] };
    }

    const participantIds = conversation.participants.map((p) => p.userId);
    const shape = {
        id: conversation.id,
        teamId: conversation.teamId,
        type: conversation.type,
        name: conversation.name,
    };

    if (participantIds.includes(user.id)) {
        return { allowed: true, conversation: shape, participantIds };
    }

    if (conversation.type === 'TEAM' && conversation.teamId) {
        const membership = await prisma.teamMember.findFirst({
            where: { userId: user.id, teamId: conversation.teamId },
            select: { id: true },
        });
        if (membership) {
            // Self-heal the missing participant row so unread counts start working.
            await prisma.conversationParticipant.createMany({
                data: [{ conversationId: conversation.id, userId: user.id }],
                skipDuplicates: true,
            });
            return {
                allowed: true,
                conversation: shape,
                participantIds: [...participantIds, user.id],
            };
        }
    }

    return { allowed: false, conversation: shape, participantIds };
}

/**
 * Users the caller is allowed to start a direct or group chat with: anyone sharing
 * at least one team. Prevents using the endpoint to message arbitrary accounts.
 */
export async function findSharedTeamUserIds(
    userId: string,
    candidateIds: string[],
): Promise<Set<string>> {
    if (candidateIds.length === 0) return new Set();

    const myTeams = await prisma.teamMember.findMany({
        where: { userId },
        select: { teamId: true },
    });
    const teamIds = myTeams.map((t) => t.teamId);
    if (teamIds.length === 0) return new Set();

    const shared = await prisma.teamMember.findMany({
        where: { teamId: { in: teamIds }, userId: { in: candidateIds } },
        select: { userId: true },
    });

    return new Set(shared.map((s) => s.userId));
}

/** Open (or reuse) the direct thread between two users. */
export async function getOrCreateDirectConversation(
    userId: string,
    otherUserId: string,
    teamId: string | null,
): Promise<string> {
    const key = directLookupKey([userId, otherUserId]);

    const conversation = await prisma.conversation.upsert({
        where: { lookupKey: key },
        create: {
            type: 'DIRECT',
            teamId,
            lookupKey: key,
            createdById: userId,
            participants: {
                create: [{ userId }, { userId: otherUserId }],
            },
        },
        update: {},
        select: { id: true },
    });

    return conversation.id;
}
