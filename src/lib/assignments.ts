/**
 * Event duty assignments and fair rotation.
 *
 * Distinct from the snack sign-up sheet (EventVolunteerNeed), which people claim
 * voluntarily. An assignment is handed to a named person, and the rotation spreads
 * duties evenly so the same two parents don't end up running the scoreboard all season.
 */

import prisma from './db';

export const ASSIGNMENT_ROLES = [
    'SCOREKEEPER',
    'REFEREE',
    'FIELD_SETUP',
    'FIELD_TEARDOWN',
    'CONCESSIONS',
    'TEAM_PARENT',
    'PHOTOGRAPHER',
    'TRANSPORT',
    'OTHER',
] as const;

export type AssignmentRole = (typeof ASSIGNMENT_ROLES)[number];

export const ROLE_LABELS: Record<string, string> = {
    SCOREKEEPER: 'Scorekeeper',
    REFEREE: 'Referee',
    FIELD_SETUP: 'Field setup',
    FIELD_TEARDOWN: 'Field teardown',
    CONCESSIONS: 'Concessions',
    TEAM_PARENT: 'Team parent',
    PHOTOGRAPHER: 'Photographer',
    TRANSPORT: 'Transport',
    OTHER: 'Other',
};

export function isAssignmentRole(value: unknown): value is AssignmentRole {
    return ASSIGNMENT_ROLES.includes(value as AssignmentRole);
}

export function roleLabel(role: string, label?: string | null): string {
    if (role === 'OTHER' && label) return label;
    return ROLE_LABELS[role] ?? role;
}

export interface RotationCandidate {
    userId: string;
    name: string;
    /** How many assignments this person already holds for the season. */
    existingCount: number;
}

export interface RotationResult {
    eventId: string;
    userId: string;
    role: string;
}

/**
 * Spread one role across a set of events, giving each turn to whoever currently has
 * the fewest duties.
 *
 * Ties break on how recently someone was assigned, then on name, so the outcome is
 * deterministic — re-running the rotation with the same inputs produces the same
 * roster rather than shuffling parents around.
 */
export function planRotation({
    eventIds,
    candidates,
    role,
    slotsPerEvent = 1,
}: {
    eventIds: string[];
    candidates: RotationCandidate[];
    role: string;
    slotsPerEvent?: number;
}): RotationResult[] {
    if (eventIds.length === 0 || candidates.length === 0) return [];

    // Working tally, seeded with duties already on the books so a rotation added
    // mid-season doesn't pile more onto people who have already done their share.
    const load = new Map<string, number>();
    const order = new Map<string, number>();
    candidates.forEach((c, index) => {
        load.set(c.userId, c.existingCount);
        order.set(c.userId, index);
    });

    const nameById = new Map(candidates.map((c) => [c.userId, c.name]));
    const results: RotationResult[] = [];

    for (const eventId of eventIds) {
        // Nobody should hold the same role twice at one event.
        const usedHere = new Set<string>();

        for (let slot = 0; slot < slotsPerEvent; slot += 1) {
            const next = candidates
                .filter((c) => !usedHere.has(c.userId))
                .sort((a, b) => {
                    const loadDiff = (load.get(a.userId) ?? 0) - (load.get(b.userId) ?? 0);
                    if (loadDiff !== 0) return loadDiff;
                    const nameDiff = (nameById.get(a.userId) ?? '').localeCompare(nameById.get(b.userId) ?? '');
                    if (nameDiff !== 0) return nameDiff;
                    return (order.get(a.userId) ?? 0) - (order.get(b.userId) ?? 0);
                })[0];

            // Fewer candidates than slots at this event; leave the rest open.
            if (!next) break;

            results.push({ eventId, userId: next.userId, role });
            usedHere.add(next.userId);
            load.set(next.userId, (load.get(next.userId) ?? 0) + 1);
        }
    }

    return results;
}

/**
 * Build the candidate pool for a team's rotation.
 *
 * Defaults to parents and coaches — the people who actually staff a sideline — and
 * counts each person's existing assignments so the rotation starts from reality.
 */
export async function loadRotationCandidates(
    teamId: string,
    { roles = ['PARENT', 'COACH', 'MANAGER'], role }: { roles?: string[]; role: string },
): Promise<RotationCandidate[]> {
    const members = await prisma.teamMember.findMany({
        where: { teamId, role: { in: roles } },
        select: { userId: true, user: { select: { name: true } } },
    });

    if (members.length === 0) return [];

    const counts = await prisma.eventAssignment.groupBy({
        by: ['userId'],
        where: {
            role,
            userId: { in: members.map((m) => m.userId) },
            event: { teamId },
            status: { not: 'DECLINED' },
        },
        _count: { _all: true },
    });

    const countByUser = new Map(counts.map((c) => [c.userId, c._count._all]));

    return members
        .map((m) => ({
            userId: m.userId,
            name: m.user.name,
            existingCount: countByUser.get(m.userId) ?? 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
}
