import prisma from '@/lib/db';
import type { SessionUser } from '@/lib/session';

const STAFF_TEAM_ROLES = new Set(['COACH', 'MANAGER']);

export function isGlobalStaff(user: SessionUser): boolean {
    return user.role === 'ADMIN' || (user.role === 'COACH' && user.coachApproved);
}

export function isApprovedCoachOrAdmin(user: SessionUser): boolean {
    return isGlobalStaff(user);
}

export async function getTeamMembership(userId: string, teamId: string) {
    return prisma.teamMember.findFirst({
        where: { userId, teamId },
        select: { role: true, teamId: true, userId: true },
    });
}

export async function isTeamMember(user: SessionUser, teamId: string): Promise<boolean> {
    if (isGlobalStaff(user)) {
        const membership = await getTeamMembership(user.id, teamId);
        return Boolean(membership);
    }
    const membership = await getTeamMembership(user.id, teamId);
    return Boolean(membership);
}

export async function isTeamStaff(user: SessionUser, teamId: string): Promise<boolean> {
    if (user.role === 'ADMIN') return true;
    if (user.role === 'COACH' && !user.coachApproved) return false;
    const membership = await getTeamMembership(user.id, teamId);
    return Boolean(membership && (STAFF_TEAM_ROLES.has(membership.role) || user.role === 'COACH'));
}

export async function isUserOnTeam(userId: string, teamId: string): Promise<boolean> {
    const membership = await getTeamMembership(userId, teamId);
    return Boolean(membership);
}
