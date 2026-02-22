import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
    const user = getSessionUser(req);
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    try {
        // Get the teams the user belongs to
        const memberships = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { teamId: true },
        });
        const teamIds = memberships.map((m) => m.teamId);

        // Fetch announcements for those teams
        const announcements = await prisma.announcement.findMany({
            where: { teamId: { in: teamIds } },
            orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
            take: 10,
            include: {
                author: { select: { name: true } },
                team: { select: { name: true } },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                announcements: announcements.map((a) => ({
                    id: a.id,
                    title: a.title,
                    content: a.body,
                    date: a.createdAt.toISOString(),
                    priority: a.priority,
                    pinned: a.pinned,
                    authorName: a.author.name,
                    teamName: a.team.name,
                })),
            },
        });
    } catch (error) {
        console.error('Dashboard API error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load dashboard data' }, { status: 500 });
    }
}
