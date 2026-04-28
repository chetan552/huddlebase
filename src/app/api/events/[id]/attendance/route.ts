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

        const { id: eventId } = await params;

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { teamId: true },
        });
        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }

        // Get all team members for this event's team
        const members = await prisma.teamMember.findMany({
            where: { teamId: event.teamId },
            include: {
                user: { select: { id: true, name: true, avatar: true } },
            },
        });

        // Get existing attendance records
        const attendances = await prisma.attendance.findMany({
            where: { eventId },
        });

        const data = members.map((m) => {
            const att = attendances.find((a) => a.userId === m.userId);
            return {
                userId: m.userId,
                userName: m.user.name,
                userAvatar: m.user.avatar,
                present: att?.present ?? null,
                arrivedAt: att?.arrivedAt?.toISOString() || null,
                lateReason: att?.lateReason || null,
            };
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Fetch attendance error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch attendance' }, { status: 500 });
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
        const { records } = await req.json() as {
            records: Array<{
                userId: string;
                present: boolean;
                lateReason?: string | null;
            }>;
        };

        const event = await prisma.event.findUnique({
            where: { id: eventId },
            select: { teamId: true },
        });
        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }

        // Verify caller is staff on this team
        const membership = await prisma.teamMember.findFirst({
            where: { teamId: event.teamId, userId: user.id },
        });
        const isStaff = user.role === 'ADMIN' || user.role === 'COACH' || membership?.role === 'COACH';
        if (!isStaff) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // Upsert attendance records
        await prisma.$transaction(
            records.map((r) =>
                prisma.attendance.upsert({
                    where: {
                        userId_eventId: {
                            userId: r.userId,
                            eventId,
                        },
                    },
                    update: {
                        present: r.present,
                        lateReason: r.lateReason || null,
                        arrivedAt: r.present ? new Date() : null,
                    },
                    create: {
                        userId: r.userId,
                        eventId,
                        present: r.present,
                        lateReason: r.lateReason || null,
                        arrivedAt: r.present ? new Date() : null,
                    },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Save attendance error:', error);
        return NextResponse.json({ success: false, error: 'Failed to save attendance' }, { status: 500 });
    }
}
