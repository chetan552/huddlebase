/**
 * Season-long availability.
 *
 * A family marks a date range away once; every event inside it gets an RSVP filled
 * in on their behalf. Auto-filled RSVPs are flagged so an explicit answer from the
 * player always wins and is never overwritten by a later block.
 */

import prisma from './db';

export const AVAILABILITY_STATUSES = ['UNAVAILABLE', 'LIMITED', 'AVAILABLE'] as const;
export type AvailabilityStatus = (typeof AVAILABILITY_STATUSES)[number];

/** How a block's status maps onto an event RSVP. LIMITED means "ask me", i.e. MAYBE. */
const STATUS_TO_RSVP: Record<AvailabilityStatus, string> = {
    UNAVAILABLE: 'NOT_GOING',
    LIMITED: 'MAYBE',
    AVAILABLE: 'GOING',
};

export function isAvailabilityStatus(value: unknown): value is AvailabilityStatus {
    return AVAILABILITY_STATUSES.includes(value as AvailabilityStatus);
}

export function rsvpStatusForBlock(status: AvailabilityStatus): string {
    return STATUS_TO_RSVP[status];
}

interface BlockLike {
    id: string;
    userId: string;
    teamId: string | null;
    startDate: Date;
    endDate: Date;
    status: string;
    reason: string | null;
}

/**
 * Write auto-filled RSVPs for every event a block covers.
 *
 * Only touches rows that are absent or already auto-filled, so a player who
 * answered by hand keeps their answer.
 */
export async function applyBlockToEvents(block: BlockLike): Promise<number> {
    if (!isAvailabilityStatus(block.status)) return 0;

    // A block scoped to one team only affects that team; an unscoped block covers
    // every team the user is currently on.
    let teamIds: string[];
    if (block.teamId) {
        teamIds = [block.teamId];
    } else {
        const memberships = await prisma.teamMember.findMany({
            where: { userId: block.userId },
            select: { teamId: true },
        });
        teamIds = memberships.map((m) => m.teamId);
    }
    if (teamIds.length === 0) return 0;

    const events = await prisma.event.findMany({
        where: {
            teamId: { in: teamIds },
            isCancelled: false,
            startTime: { gte: block.startDate, lte: block.endDate },
        },
        select: { id: true },
    });
    if (events.length === 0) return 0;

    const eventIds = events.map((e) => e.id);
    const status = rsvpStatusForBlock(block.status);
    const note = block.reason ? `Away: ${block.reason}` : 'Set from availability';

    const existing = await prisma.rSVP.findMany({
        where: { userId: block.userId, eventId: { in: eventIds } },
        select: { id: true, eventId: true, autoFilled: true, status: true },
    });

    const explicit = new Set(
        existing.filter((r) => !r.autoFilled && r.status !== 'PENDING').map((r) => r.eventId),
    );
    const overwritable = existing.filter(
        (r) => r.autoFilled || r.status === 'PENDING',
    );
    const seen = new Set(existing.map((r) => r.eventId));

    let changed = 0;

    if (overwritable.length > 0) {
        const updated = await prisma.rSVP.updateMany({
            where: { id: { in: overwritable.map((r) => r.id) } },
            data: { status, note, autoFilled: true },
        });
        changed += updated.count;
    }

    const missing = eventIds.filter((id) => !seen.has(id) && !explicit.has(id));
    if (missing.length > 0) {
        const created = await prisma.rSVP.createMany({
            data: missing.map((eventId) => ({
                userId: block.userId,
                eventId,
                status,
                note,
                autoFilled: true,
            })),
            skipDuplicates: true,
        });
        changed += created.count;
    }

    return changed;
}

/**
 * Reset the RSVPs a block created, used when it is deleted or shortened.
 * Explicit answers are left alone.
 */
export async function clearBlockFromEvents(block: BlockLike): Promise<number> {
    const teamIds = block.teamId
        ? [block.teamId]
        : (
              await prisma.teamMember.findMany({
                  where: { userId: block.userId },
                  select: { teamId: true },
              })
          ).map((m) => m.teamId);
    if (teamIds.length === 0) return 0;

    const events = await prisma.event.findMany({
        where: {
            teamId: { in: teamIds },
            startTime: { gte: block.startDate, lte: block.endDate },
        },
        select: { id: true },
    });
    if (events.length === 0) return 0;

    const cleared = await prisma.rSVP.updateMany({
        where: {
            userId: block.userId,
            eventId: { in: events.map((e) => e.id) },
            autoFilled: true,
        },
        data: { status: 'PENDING', note: null, autoFilled: false },
    });

    return cleared.count;
}

/**
 * Fill RSVPs for newly created events that land inside an existing block.
 * Called when events are created so a block set in advance still applies.
 */
export async function applyAvailabilityToEvents(
    events: { id: string; teamId: string; startTime: Date }[],
): Promise<void> {
    if (events.length === 0) return;

    try {
        const teamIds = Array.from(new Set(events.map((e) => e.teamId)));
        const times = events.map((e) => e.startTime.getTime());
        const earliest = new Date(Math.min(...times));
        const latest = new Date(Math.max(...times));

        const blocks = await prisma.availabilityBlock.findMany({
            where: {
                OR: [{ teamId: { in: teamIds } }, { teamId: null }],
                startDate: { lte: latest },
                endDate: { gte: earliest },
            },
        });
        if (blocks.length === 0) return;

        // Members of the affected teams, so an unscoped block only touches users
        // who are actually on the team the event belongs to.
        const memberships = await prisma.teamMember.findMany({
            where: { teamId: { in: teamIds } },
            select: { userId: true, teamId: true },
        });
        const teamsByUser = new Map<string, Set<string>>();
        for (const m of memberships) {
            if (!teamsByUser.has(m.userId)) teamsByUser.set(m.userId, new Set());
            teamsByUser.get(m.userId)!.add(m.teamId);
        }

        const rows: { userId: string; eventId: string; status: string; note: string; autoFilled: boolean }[] = [];

        for (const block of blocks) {
            if (!isAvailabilityStatus(block.status)) continue;
            const userTeams = teamsByUser.get(block.userId);
            if (!userTeams) continue;

            for (const event of events) {
                if (block.teamId && block.teamId !== event.teamId) continue;
                if (!userTeams.has(event.teamId)) continue;
                if (event.startTime < block.startDate || event.startTime > block.endDate) continue;

                rows.push({
                    userId: block.userId,
                    eventId: event.id,
                    status: rsvpStatusForBlock(block.status),
                    note: block.reason ? `Away: ${block.reason}` : 'Set from availability',
                    autoFilled: true,
                });
            }
        }

        if (rows.length > 0) {
            await prisma.rSVP.createMany({ data: rows, skipDuplicates: true });
        }
    } catch (error) {
        // Pre-filling is a convenience; never fail event creation over it.
        console.error('[Availability] Failed to apply blocks to new events:', error);
    }
}
