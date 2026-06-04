import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isApprovedCoachOrAdmin } from '@/lib/permissions';

type Severity = 'high' | 'medium' | 'low';

interface PendingTask {
    id: string;
    type: 'invoice' | 'rsvp' | 'profile';
    title: string;
    description: string;
    count: number;
    severity: Severity;
    href: string;
}

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (!isApprovedCoachOrAdmin(user)) {
            return NextResponse.json({ success: true, data: [] });
        }

        const memberships = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { teamId: true },
        });
        const teamIds = memberships.map((m) => m.teamId);
        if (teamIds.length === 0) {
            return NextResponse.json({ success: true, data: [] });
        }

        const now = new Date();
        const sevenDaysFromNow = new Date(now);
        sevenDaysFromNow.setDate(now.getDate() + 7);

        const tasks: PendingTask[] = [];

        // Overdue invoices
        const overdueInvoices = await prisma.invoice.findMany({
            where: {
                teamId: { in: teamIds },
                status: { in: ['PENDING', 'OVERDUE'] },
                dueDate: { lt: now },
            },
            select: { id: true, amount: true },
        });
        if (overdueInvoices.length > 0) {
            const total = overdueInvoices.reduce((sum, i) => sum + i.amount, 0);
            tasks.push({
                id: 'overdue-invoices',
                type: 'invoice',
                title: 'Overdue invoices',
                description: `${overdueInvoices.length} unpaid · $${total.toFixed(2)} total`,
                count: overdueInvoices.length,
                severity: 'high',
                href: '/payments',
            });
        }

        // Upcoming events (next 7 days) where >50% of players haven't RSVP'd
        const upcomingEvents = await prisma.event.findMany({
            where: {
                teamId: { in: teamIds },
                isCancelled: false,
                startTime: { gte: now, lte: sevenDaysFromNow },
            },
            include: {
                team: {
                    select: {
                        members: {
                            where: { role: 'PLAYER' },
                            select: { userId: true },
                        },
                    },
                },
                rsvps: { select: { userId: true, status: true } },
            },
            orderBy: { startTime: 'asc' },
        });

        for (const event of upcomingEvents) {
            const playerIds = event.team.members.map((m) => m.userId);
            if (playerIds.length === 0) continue;
            const respondedIds = new Set(
                event.rsvps.filter((r) => r.status !== 'PENDING').map((r) => r.userId)
            );
            const pendingCount = playerIds.filter((id) => !respondedIds.has(id)).length;
            if (pendingCount > 0 && pendingCount / playerIds.length > 0.5) {
                tasks.push({
                    id: `rsvp-${event.id}`,
                    type: 'rsvp',
                    title: `${event.title} — pending RSVPs`,
                    description: `${pendingCount} of ${playerIds.length} players haven't responded`,
                    count: pendingCount,
                    severity: 'medium',
                    href: `/schedule?eventId=${event.id}`,
                });
            }
        }

        // Players missing emergency contact info
        const players = await prisma.teamMember.findMany({
            where: { teamId: { in: teamIds }, role: 'PLAYER' },
            select: {
                userId: true,
                user: {
                    select: {
                        playerProfile: {
                            select: { emergencyContact: true, emergencyPhone: true },
                        },
                    },
                },
            },
        });
        const totalPlayers = new Set(players.map((p) => p.userId)).size;
        const incompletePlayers = new Set<string>();
        for (const p of players) {
            const profile = p.user.playerProfile;
            if (!profile || !profile.emergencyContact || !profile.emergencyPhone) {
                incompletePlayers.add(p.userId);
            }
        }
        if (incompletePlayers.size > 0) {
            tasks.push({
                id: 'incomplete-profiles',
                type: 'profile',
                title: 'Player profiles incomplete',
                description: `${incompletePlayers.size} of ${totalPlayers} players missing emergency contact`,
                count: incompletePlayers.size,
                severity: 'low',
                href: '/roster',
            });
        }

        return NextResponse.json({ success: true, data: tasks });
    } catch (error) {
        console.error('Pending tasks error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch tasks' }, { status: 500 });
    }
}
