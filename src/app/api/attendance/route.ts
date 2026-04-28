import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { toCSV } from '@/lib/utils';

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userTeams = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { teamId: true },
        });
        const teamIds = userTeams.map((t) => t.teamId);

        const records = await prisma.attendance.findMany({
            where: { event: { teamId: { in: teamIds } } },
            include: {
                user: { select: { name: true, email: true } },
                event: {
                    select: {
                        title: true,
                        type: true,
                        startTime: true,
                        team: { select: { name: true } },
                    },
                },
            },
            orderBy: { event: { startTime: 'desc' } },
        });

        const data = records.map((r) => ({
            teamName: r.event.team.name,
            eventTitle: r.event.title,
            eventType: r.event.type,
            eventDate: r.event.startTime.toISOString().split('T')[0],
            playerName: r.user.name,
            playerEmail: r.user.email,
            present: r.present ? 'Yes' : 'No',
            arrivedAt: r.arrivedAt?.toISOString() || '',
            lateReason: r.lateReason || '',
        }));

        if (req.nextUrl.searchParams.get('format') === 'csv') {
            const csv = toCSV(data, [
                { key: 'teamName', header: 'Team' },
                { key: 'eventDate', header: 'Date' },
                { key: 'eventTitle', header: 'Event' },
                { key: 'eventType', header: 'Type' },
                { key: 'playerName', header: 'Player' },
                { key: 'playerEmail', header: 'Email' },
                { key: 'present', header: 'Present' },
                { key: 'arrivedAt', header: 'Arrived At' },
                { key: 'lateReason', header: 'Late Reason' },
            ]);
            return new NextResponse(csv, {
                headers: {
                    'Content-Type': 'text/csv',
                    'Content-Disposition': 'attachment; filename="attendance.csv"',
                },
            });
        }

        return NextResponse.json({ success: true, data });
    } catch (error) {
        console.error('Fetch attendance export error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch attendance' }, { status: 500 });
    }
}
