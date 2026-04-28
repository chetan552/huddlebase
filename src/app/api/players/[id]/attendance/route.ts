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

        const { id: playerId } = await params;

        const attendances = await prisma.attendance.findMany({
            where: { userId: playerId },
            include: {
                event: {
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        startTime: true,
                        team: { select: { name: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const data = attendances.map((a) => ({
            id: a.id,
            present: a.present,
            arrivedAt: a.arrivedAt?.toISOString() || null,
            lateReason: a.lateReason,
            event: {
                id: a.event.id,
                title: a.event.title,
                type: a.event.type,
                startTime: a.event.startTime.toISOString(),
                teamName: a.event.team.name,
            },
        }));

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Fetch player attendance error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch attendance' }, { status: 500 });
    }
}
