import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';

function isVolunteerTableMissing(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';
}

async function getEventForUser(eventId: string, userId: string) {
    return prisma.event.findFirst({
        where: {
            id: eventId,
            team: {
                members: {
                    some: { userId },
                },
            },
        },
        include: {
            team: {
                select: {
                    members: {
                        where: { userId },
                        select: { role: true },
                    },
                },
            },
        },
    });
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id: eventId } = await params;
        const event = await getEventForUser(eventId, user.id);
        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }

        const needs = await prisma.eventVolunteerNeed.findMany({
            where: { eventId },
            include: {
                signups: {
                    include: {
                        user: {
                            select: { id: true, name: true, avatar: true },
                        },
                    },
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { createdAt: 'asc' },
        });

        return NextResponse.json({
            success: true,
            data: needs.map((need) => ({
                id: need.id,
                type: need.type,
                title: need.title,
                description: need.description,
                slotsNeeded: need.slotsNeeded,
                signups: need.signups.map((signup) => ({
                    id: signup.id,
                    userId: signup.user.id,
                    userName: signup.user.name,
                    userAvatar: signup.user.avatar,
                    note: signup.note,
                    createdAt: signup.createdAt.toISOString(),
                })),
            })),
        });
    } catch (error) {
        if (isVolunteerTableMissing(error)) {
            return NextResponse.json({ success: true, data: [], migrationRequired: true });
        }

        console.error('Fetch volunteers error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch volunteers' }, { status: 500 });
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

        const { id: eventId } = await params;
        const event = await getEventForUser(eventId, user.id);

        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, event.teamId))) {
            return NextResponse.json({ success: false, error: 'Only staff can manage volunteer needs' }, { status: 403 });
        }

        const { needs } = await req.json();
        if (!Array.isArray(needs)) {
            return NextResponse.json({ success: false, error: 'Needs must be an array' }, { status: 400 });
        }

        const sanitizedNeeds = needs
            .map((need) => ({
                id: typeof need.id === 'string' ? need.id : undefined,
                type: ['SNACKS', 'DRINKS', 'OTHER'].includes(need.type) ? need.type : 'OTHER',
                title: typeof need.title === 'string' ? need.title.trim() : '',
                description: typeof need.description === 'string' && need.description.trim() ? need.description.trim() : null,
                slotsNeeded: Math.max(1, Math.min(20, Number(need.slotsNeeded) || 1)),
            }))
            .filter((need) => need.title.length > 0);

        await prisma.$transaction(async (tx) => {
            const incomingIds = sanitizedNeeds.map((need) => need.id).filter(Boolean) as string[];

            await tx.eventVolunteerNeed.deleteMany({
                where: {
                    eventId,
                    id: { notIn: incomingIds },
                },
            });

            for (const need of sanitizedNeeds) {
                if (need.id) {
                    await tx.eventVolunteerNeed.updateMany({
                        where: { id: need.id, eventId },
                        data: {
                            type: need.type,
                            title: need.title,
                            description: need.description,
                            slotsNeeded: need.slotsNeeded,
                        },
                    });
                } else {
                    await tx.eventVolunteerNeed.create({
                        data: {
                            eventId,
                            type: need.type,
                            title: need.title,
                            description: need.description,
                            slotsNeeded: need.slotsNeeded,
                        },
                    });
                }
            }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (isVolunteerTableMissing(error)) {
            return NextResponse.json({
                success: false,
                error: 'Snack and drink signups need a database migration before they can be saved.',
            }, { status: 424 });
        }

        console.error('Save volunteers error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save volunteers' }, { status: 500 });
    }
}
