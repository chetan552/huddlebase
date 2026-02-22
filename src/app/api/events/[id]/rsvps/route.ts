import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const eventId = resolvedParams.id;

        if (!eventId) {
            return NextResponse.json({ success: false, error: 'Event ID is required' }, { status: 400 });
        }

        const rsvps = await prisma.rSVP.findMany({
            where: { eventId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        avatar: true,
                    },
                },
            },
        });

        // Format for the frontend
        const data = rsvps.map((rsvp) => ({
            id: rsvp.id,
            userId: rsvp.user.id,
            userName: rsvp.user.name,
            userAvatar: rsvp.user.avatar,
            status: rsvp.status,
            note: rsvp.note,
            updatedAt: rsvp.updatedAt.toISOString(),
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Fetch RSVPs error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch RSVPs' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const resolvedParams = await params;
        const eventId = resolvedParams.id;
        const { status, note, userId: targetUserId } = await req.json();

        if (!status) {
            return NextResponse.json({ success: false, error: 'Status is required' }, { status: 400 });
        }

        // Determine whose RSVP this is for
        let rsvpUserId = user.id;

        if (targetUserId && targetUserId !== user.id) {
            // Parent RSVPing on behalf of a child — verify family link
            if (user.role !== 'PARENT') {
                return NextResponse.json({ success: false, error: 'Only parents can RSVP on behalf of others' }, { status: 403 });
            }

            const familyLink = await prisma.familyLink.findFirst({
                where: { parentId: user.id, childId: targetUserId, status: 'ACTIVE' },
            });

            if (!familyLink) {
                return NextResponse.json({ success: false, error: 'You can only RSVP for your linked children' }, { status: 403 });
            }

            rsvpUserId = targetUserId;
        }

        const rsvp = await prisma.rSVP.upsert({
            where: {
                userId_eventId: {
                    userId: rsvpUserId,
                    eventId,
                }
            },
            update: {
                status,
                note: note || undefined,
            },
            create: {
                userId: rsvpUserId,
                eventId,
                status,
                note,
            }
        });

        return NextResponse.json({ success: true, data: rsvp });
    } catch (error) {
        console.error('Update RSVP error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update RSVP' }, { status: 500 });
    }
}
