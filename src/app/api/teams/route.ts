import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const teams = await prisma.team.findMany({
            where: {
                members: { some: { userId: user.id } },
            },
            include: {
                _count: { select: { members: true, events: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const data = teams.map((t) => ({
            id: t.id,
            name: t.name,
            sport: t.sport,
            season: t.season,
            color: t.color,
            logo: t.logo,
            memberCount: t._count.members,
            upcomingEvents: t._count.events,
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Fetch teams error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch teams' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { name, sport, season, color } = await req.json();

        if (!name || !sport) {
            return NextResponse.json({ success: false, error: 'Name and sport are required' }, { status: 400 });
        }

        const team = await prisma.team.create({
            data: {
                name,
                sport,
                season: season || null,
                color: color || '#3b82f6',
                members: {
                    create: {
                        userId: user.id,
                        role: 'COACH',
                    },
                },
            },
            include: {
                _count: { select: { members: true, events: true } },
            },
        });

        return NextResponse.json({
            success: true,
            data: {
                id: team.id,
                name: team.name,
                sport: team.sport,
                season: team.season,
                color: team.color,
                memberCount: team._count.members,
                upcomingEvents: team._count.events,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Create team error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create team' }, { status: 500 });
    }
}
