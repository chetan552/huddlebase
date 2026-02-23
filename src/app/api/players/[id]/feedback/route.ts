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
        const feedback = await prisma.playerFeedback.findMany({
            where: { playerId },
            include: { coach: { select: { name: true, avatar: true } } },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({ success: true, data: feedback });
    } catch (error) {
        console.error('Fetch player feedback error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch player feedback' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user || user.role !== 'COACH') {
            return NextResponse.json({ success: false, error: 'Unauthorized. Coaches only.' }, { status: 403 });
        }

        const { id: playerId } = await params;
        const body = await req.json();
        const { effortRating, note } = body;

        if (!effortRating || !note) {
            return NextResponse.json({ success: false, error: 'Effort rating and note string are required' }, { status: 400 });
        }

        const feedback = await prisma.playerFeedback.create({
            data: {
                playerId,
                coachId: user.id,
                effortRating: parseInt(effortRating, 10),
                note,
            },
            include: { coach: { select: { name: true, avatar: true } } }
        });

        return NextResponse.json({ success: true, data: feedback }, { status: 201 });
    } catch (error) {
        console.error('Create player feedback error:', error);
        return NextResponse.json({ success: false, error: 'Failed to record feedback' }, { status: 500 });
    }
}
