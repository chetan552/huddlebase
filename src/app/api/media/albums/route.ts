import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember } from '@/lib/permissions';

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get('teamId');

        if (!teamId) {
            return NextResponse.json({ success: false, error: 'teamId is required' }, { status: 400 });
        }
        if (!(await isTeamMember(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const albums = await prisma.mediaAlbum.findMany({
            where: { teamId },
            include: {
                createdBy: { select: { id: true, name: true } },
                _count: { select: { items: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            data: albums.map((a) => ({
                id: a.id,
                name: a.name,
                description: a.description,
                coverUrl: a.coverUrl,
                eventId: a.eventId,
                itemCount: a._count.items,
                createdById: a.createdById,
                createdByName: a.createdBy.name,
                createdAt: a.createdAt.toISOString(),
            })),
        });
    } catch (error) {
        console.error('Fetch albums error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch albums' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId, name, description, eventId } = await req.json();

        if (!teamId || !name?.trim()) {
            return NextResponse.json({ success: false, error: 'teamId and name are required' }, { status: 400 });
        }
        // Any member can start an album — parents are the ones with the game photos.
        if (!(await isTeamMember(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        if (eventId) {
            const event = await prisma.event.findFirst({
                where: { id: eventId, teamId },
                select: { id: true },
            });
            if (!event) {
                return NextResponse.json({ success: false, error: 'Event not found for this team' }, { status: 404 });
            }
        }

        const album = await prisma.mediaAlbum.create({
            data: {
                teamId,
                name: name.trim().slice(0, 120),
                description: description?.trim()?.slice(0, 500) || null,
                eventId: eventId || null,
                createdById: user.id,
            },
        });

        return NextResponse.json(
            {
                success: true,
                data: {
                    id: album.id,
                    name: album.name,
                    description: album.description,
                    coverUrl: null,
                    itemCount: 0,
                    createdAt: album.createdAt.toISOString(),
                },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('Create album error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create album' }, { status: 500 });
    }
}
