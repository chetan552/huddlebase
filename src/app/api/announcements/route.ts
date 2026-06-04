import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { sendEmail, announcementEmail } from '@/lib/email';
import { isApprovedCoachOrAdmin } from '@/lib/permissions';

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
    if (!isApprovedCoachOrAdmin(user)) {
        return NextResponse.json({ success: false, error: 'Coach approval is required to post announcements' }, { status: 403 });
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

        // Notify team members
        const members = await prisma.teamMember.findMany({
            where: { teamId, userId: { not: user.id } },
            include: { user: { select: { email: true } } },
        });
        if (members.length > 0) {
            await prisma.notification.createMany({
                data: members.map((m) => ({
                    userId: m.userId,
                    type: 'NEW_EVENT',
                    title: `Announcement from ${announcement.team.name}`,
                    body: `${announcement.author.name}: ${title}`,
                    link: `/teams`,
                })),
            });

            const emails = members.map((m) => m.user.email).filter(Boolean) as string[];
            if (emails.length > 0) {
                const html = announcementEmail({
                    title,
                    body,
                    teamName: announcement.team.name,
                    priority: priority || 'NORMAL',
                });
                await sendEmail({
                    to: emails,
                    subject: `[${announcement.team.name}] ${title}`,
                    html,
                });
            }
        }

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
