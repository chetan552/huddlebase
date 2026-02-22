import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userTeams = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { teamId: true },
        });
        const teamIds = userTeams.map((t) => t.teamId);

        const events = await prisma.event.findMany({
            where: { teamId: { in: teamIds } },
            include: { team: { select: { name: true, color: true } } },
            orderBy: { startTime: 'asc' },
        });

        const data = events.map((e) => ({
            id: e.id,
            title: e.title,
            type: e.type,
            startTime: e.startTime.toISOString(),
            endTime: e.endTime?.toISOString() || null,
            location: e.location,
            description: e.description,
            teamId: e.teamId,
            teamName: e.team.name,
            teamColor: e.team.color,
            isCancelled: e.isCancelled,
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Fetch events error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { title, type, teamId, location, startTime, endTime, notes } = await req.json();

        if (!title || !teamId || !startTime) {
            return NextResponse.json({ success: false, error: 'Title, team, and start time are required' }, { status: 400 });
        }

        const event = await prisma.event.create({
            data: {
                title,
                type: type || 'PRACTICE',
                teamId,
                location: location || null,
                startTime: new Date(startTime),
                endTime: endTime ? new Date(endTime) : null,
                notes: notes || null,
            },
            include: { team: { select: { name: true, color: true } } },
        });

        // Notify team members
        const members = await prisma.teamMember.findMany({
            where: { teamId, userId: { not: user.id } },
            select: { userId: true },
        });
        if (members.length > 0) {
            await prisma.notification.createMany({
                data: members.map((m) => ({
                    userId: m.userId,
                    type: 'NEW_EVENT',
                    title: `New ${(type || 'PRACTICE').toLowerCase()}: ${title}`,
                    body: `${user.name} added a new event to ${event.team.name}`,
                    link: `/schedule`,
                })),
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: event.id,
                title: event.title,
                type: event.type,
                startTime: event.startTime.toISOString(),
                endTime: event.endTime?.toISOString() || null,
                location: event.location,
                teamName: event.team.name,
                teamColor: event.team.color,
                isCancelled: event.isCancelled,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Create event error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
    }
}
