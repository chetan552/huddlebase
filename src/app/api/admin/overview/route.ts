import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        if (user.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
        }

        const [users, teams, auditLogs, eventsCount, invoicesCount] = await Promise.all([
            prisma.user.findMany({
                select: {
                    id: true,
                    name: true,
                    email: true,
                    role: true,
                    coachApproved: true,
                    suspended: true,
                    avatar: true,
                    createdAt: true,
                    _count: {
                        select: {
                            teamMembers: true,
                            authAccounts: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.team.findMany({
                select: {
                    id: true,
                    name: true,
                    sport: true,
                    season: true,
                    color: true,
                    createdAt: true,
                    members: {
                        where: { role: { in: ['COACH', 'MANAGER'] } },
                        select: {
                            role: true,
                            user: { select: { id: true, name: true, email: true } },
                        },
                        orderBy: { joinedAt: 'asc' },
                    },
                    _count: {
                        select: {
                            members: true,
                            events: true,
                            invoices: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            }),
            prisma.auditLog.findMany({
                orderBy: { createdAt: 'desc' },
                take: 50,
            }),
            prisma.event.count(),
            prisma.invoice.count(),
        ]);

        const roleCounts = users.reduce<Record<string, number>>((counts, adminUser) => {
            counts[adminUser.role] = (counts[adminUser.role] || 0) + 1;
            return counts;
        }, {});

        return NextResponse.json({
            success: true,
            data: {
                stats: {
                    users: users.length,
                    teams: teams.length,
                    events: eventsCount,
                    invoices: invoicesCount,
                    roleCounts,
                },
                users: users.map((adminUser) => ({
                    id: adminUser.id,
                    name: adminUser.name,
                    email: adminUser.email,
                    role: adminUser.role,
                    coachApproved: adminUser.coachApproved,
                    suspended: adminUser.suspended,
                    avatar: adminUser.avatar,
                    createdAt: adminUser.createdAt.toISOString(),
                    teamCount: adminUser._count.teamMembers,
                    authProviderCount: adminUser._count.authAccounts,
                })),
                teams: teams.map((team) => ({
                    id: team.id,
                    name: team.name,
                    sport: team.sport,
                    season: team.season,
                    color: team.color,
                    createdAt: team.createdAt.toISOString(),
                    memberCount: team._count.members,
                    eventCount: team._count.events,
                    invoiceCount: team._count.invoices,
                    staff: team.members.map((member) => ({
                        role: member.role,
                        id: member.user.id,
                        name: member.user.name,
                        email: member.user.email,
                    })),
                })),
                auditLogs: auditLogs.map((log) => ({
                    id: log.id,
                    actorEmail: log.actorEmail,
                    action: log.action,
                    targetType: log.targetType,
                    targetId: log.targetId,
                    targetLabel: log.targetLabel,
                    metadata: log.metadata,
                    createdAt: log.createdAt.toISOString(),
                })),
            },
        });
    } catch (error) {
        console.error('Admin overview error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load admin overview' }, { status: 500 });
    }
}
