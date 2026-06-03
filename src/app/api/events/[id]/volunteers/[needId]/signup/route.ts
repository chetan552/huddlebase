import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

function isVolunteerTableMissing(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';
}

async function findAccessibleNeed(eventId: string, needId: string, userId: string) {
    return prisma.eventVolunteerNeed.findFirst({
        where: {
            id: needId,
            eventId,
            event: {
                team: {
                    members: {
                        some: { userId },
                    },
                },
                isCancelled: false,
            },
        },
        include: {
            signups: {
                select: { id: true, userId: true },
            },
        },
    });
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; needId: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id: eventId, needId } = await params;
        const { note } = await req.json().catch(() => ({ note: null }));

        const signup = await prisma.$transaction(
            async (tx) => {
                const need = await tx.eventVolunteerNeed.findFirst({
                    where: {
                        id: needId,
                        eventId,
                        event: {
                            team: {
                                members: {
                                    some: { userId: user.id },
                                },
                            },
                            isCancelled: false,
                        },
                    },
                    include: {
                        signups: {
                            select: { id: true, userId: true },
                        },
                    },
                });

                if (!need) {
                    throw new Error('NEED_NOT_FOUND');
                }

                const alreadySignedUp = need.signups.some((existing) => existing.userId === user.id);
                if (!alreadySignedUp && need.signups.length >= need.slotsNeeded) {
                    throw new Error('NEED_FULL');
                }

                return tx.eventVolunteerSignup.upsert({
                    where: {
                        needId_userId: {
                            needId,
                            userId: user.id,
                        },
                    },
                    update: {
                        note: typeof note === 'string' && note.trim() ? note.trim() : null,
                    },
                    create: {
                        needId,
                        userId: user.id,
                        note: typeof note === 'string' && note.trim() ? note.trim() : null,
                    },
                });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );

        return NextResponse.json({ success: true, data: signup });
    } catch (error) {
        if (error instanceof Error && error.message === 'NEED_NOT_FOUND') {
            return NextResponse.json({ success: false, error: 'Volunteer need not found' }, { status: 404 });
        }
        if (error instanceof Error && error.message === 'NEED_FULL') {
            return NextResponse.json({ success: false, error: 'This signup is already full' }, { status: 409 });
        }
        if (isVolunteerTableMissing(error)) {
            return NextResponse.json({
                success: false,
                error: 'Snack and drink signups need a database migration before they can be saved.',
            }, { status: 424 });
        }

        console.error('Volunteer signup error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save signup' }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; needId: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id: eventId, needId } = await params;
        const need = await findAccessibleNeed(eventId, needId, user.id);
        if (!need) {
            return NextResponse.json({ success: false, error: 'Volunteer need not found' }, { status: 404 });
        }

        await prisma.eventVolunteerSignup.deleteMany({
            where: {
                needId,
                userId: user.id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        if (isVolunteerTableMissing(error)) {
            return NextResponse.json({
                success: false,
                error: 'Snack and drink signups need a database migration before they can be saved.',
            }, { status: 424 });
        }

        console.error('Cancel volunteer signup error:', error);
        return NextResponse.json({ success: false, error: 'Failed to cancel signup' }, { status: 500 });
    }
}
