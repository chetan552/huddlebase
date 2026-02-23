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
        const stats = await prisma.playerStat.findMany({
            where: { userId: playerId },
            include: { event: { select: { title: true, startTime: true, type: true } } },
            orderBy: { createdAt: 'desc' },
        });

        // Parse metrics JSON string back to objects for the frontend
        const parsedStats = stats.map(stat => ({
            ...stat,
            metrics: JSON.parse(stat.metrics)
        }));

        return NextResponse.json({ success: true, data: parsedStats });
    } catch (error) {
        console.error('Fetch player stats error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch player stats' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user || (user.role !== 'COACH' && user.role !== 'ADMIN')) {
            return NextResponse.json({ success: false, error: 'Unauthorized. Staff only.' }, { status: 403 });
        }

        const { id: playerId } = await params;
        const body = await req.json();
        const { eventId, metrics, notes } = body;

        if (!eventId || !metrics) {
            return NextResponse.json({ success: false, error: 'Event ID and metrics are required' }, { status: 400 });
        }

        const stat = await prisma.playerStat.create({
            data: {
                userId: playerId,
                eventId,
                metrics: JSON.stringify(metrics),
                notes: notes || null,
            },
            include: { event: { select: { title: true, startTime: true } } }
        });

        return NextResponse.json({ success: true, data: { ...stat, metrics: JSON.parse(stat.metrics) } }, { status: 201 });
    } catch (error) {
        console.error('Create player stat error:', error);
        return NextResponse.json({ success: false, error: 'Failed to record stat' }, { status: 500 });
    }
}
