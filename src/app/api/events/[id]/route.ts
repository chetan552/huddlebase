import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { sendEmail, eventCancelledEmail } from '@/lib/email';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { isCancelled, opponentName, homeScore, awayScore, result } = await req.json();

        if (isCancelled !== undefined && typeof isCancelled !== 'boolean') {
            return NextResponse.json({ success: false, error: 'isCancelled must be a boolean' }, { status: 400 });
        }

        const event = await prisma.event.findUnique({
            where: { id },
            include: { team: { select: { name: true } } },
        });

        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }

        // Only staff can cancel events
        const membership = await prisma.teamMember.findFirst({
            where: { teamId: event.teamId, userId: user.id },
        });
        const isStaff = user.role === 'ADMIN' || user.role === 'COACH' || membership?.role === 'COACH';
        if (!isStaff) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const updated = await prisma.event.update({
            where: { id },
            data: {
                ...(isCancelled !== undefined && { isCancelled }),
                ...(opponentName !== undefined && { opponentName: opponentName || null }),
                ...(homeScore !== undefined && { homeScore: homeScore === null ? null : Number(homeScore) }),
                ...(awayScore !== undefined && { awayScore: awayScore === null ? null : Number(awayScore) }),
                ...(result !== undefined && { result: result || null }),
            },
        });

        // Notify team members on cancellation
        if (isCancelled) {
            const members = await prisma.teamMember.findMany({
                where: { teamId: event.teamId, userId: { not: user.id } },
                include: { user: { select: { email: true } } },
            });
            if (members.length > 0) {
                await prisma.notification.createMany({
                    data: members.map((m) => ({
                        userId: m.userId,
                        type: 'CANCELLED_EVENT',
                        title: `Cancelled: ${event.title}`,
                        body: `${user.name} cancelled the ${event.type.toLowerCase()} on ${event.team.name}`,
                        link: `/schedule`,
                    })),
                });

                const emails = members.map((m) => m.user.email).filter(Boolean) as string[];
                if (emails.length > 0) {
                    const html = eventCancelledEmail({
                        eventTitle: event.title,
                        eventType: event.type,
                        teamName: event.team.name,
                        startTime: event.startTime.toISOString(),
                    });
                    await sendEmail({
                        to: emails,
                        subject: `Cancelled: ${event.title}`,
                        html,
                    });
                }
            }
        }

        return NextResponse.json({ success: true, data: updated });
    } catch (error) {
        console.error('Update event error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 });
    }
}
