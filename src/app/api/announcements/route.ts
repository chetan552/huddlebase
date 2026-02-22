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

        const announcements = await prisma.announcement.findMany({
            where: { teamId: { in: teamIds } },
            orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
            take: 20,
            include: {
                author: { select: { name: true } },
                team: { select: { name: true, color: true } },
            },
        });

        return NextResponse.json({
            success: true,
            data: announcements.map((a) => ({
                id: a.id,
                teamId: a.teamId,
                teamName: a.team.name,
                teamColor: a.team.color,
                authorName: a.author.name,
                title: a.title,
                body: a.body,
                priority: a.priority,
                pinned: a.pinned,
                createdAt: a.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error('Announcements GET error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load announcements' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const user = getSessionUser(req);
    if (!user) {
        return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Only coaches and admins can post announcements
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
        return NextResponse.json({ success: false, error: 'Only coaches and admins can post announcements' }, { status: 403 });
    }

    try {
        const { teamId, title, body, priority } = await req.json();

        if (!teamId || !title || !body) {
            return NextResponse.json({ success: false, error: 'teamId, title, and body are required' }, { status: 400 });
        }

        // Verify the coach belongs to this team
        const membership = await prisma.teamMember.findFirst({
            where: { userId: user.id, teamId },
        });
        if (!membership) {
            return NextResponse.json({ success: false, error: 'You are not a member of this team' }, { status: 403 });
        }

        const announcement = await prisma.announcement.create({
            data: {
                teamId,
                authorId: user.id,
                title,
                body,
                priority: priority || 'NORMAL',
            },
            include: {
                author: { select: { name: true } },
                team: { select: { name: true, color: true } },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: announcement.id,
                teamId: announcement.teamId,
                teamName: announcement.team.name,
                teamColor: announcement.team.color,
                authorName: announcement.author.name,
                title: announcement.title,
                body: announcement.body,
                priority: announcement.priority,
                pinned: announcement.pinned,
                createdAt: announcement.createdAt.toISOString(),
            },
        });
    } catch (error) {
        console.error('Announcements POST error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create announcement' }, { status: 500 });
    }
}
