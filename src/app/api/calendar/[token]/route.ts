import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { buildCalendar, type CalendarEvent } from '@/lib/ical';
import { DEFAULT_TIMEZONE } from '@/lib/timezone';

/**
 * Public iCal subscription feed.
 *
 * Deliberately unauthenticated: calendar clients cannot present a session cookie or
 * bearer token, so the URL itself is the credential. The token is a 256-bit random
 * value the user can regenerate at any time to revoke every subscribed client.
 *
 * Scope it to one team with ?teamId=... ; otherwise it covers every team the user
 * belongs to.
 */

// Feeds must reflect schedule changes, so never serve a cached build.
export const dynamic = 'force-dynamic';

const WINDOW_PAST_DAYS = 180;
const WINDOW_FUTURE_DAYS = 400;

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
    try {
        const { token } = await params;
        // The route may be requested as /api/calendar/<token>.ics for clients that
        // insist on a file extension.
        const cleanToken = token.replace(/\.ics$/i, '');

        if (!cleanToken || cleanToken.length < 20) {
            return new NextResponse('Not found', { status: 404 });
        }

        const user = await prisma.user.findUnique({
            where: { calendarToken: cleanToken },
            select: { id: true, name: true, suspended: true, timezone: true },
        });

        if (!user || user.suspended) {
            return new NextResponse('Not found', { status: 404 });
        }

        const { searchParams } = new URL(req.url);
        const teamFilter = searchParams.get('teamId');

        const memberships = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { teamId: true },
        });
        let teamIds = memberships.map((m) => m.teamId);
        if (teamFilter) {
            teamIds = teamIds.filter((id) => id === teamFilter);
        }

        const now = Date.now();
        const events = teamIds.length
            ? await prisma.event.findMany({
                  where: {
                      teamId: { in: teamIds },
                      startTime: {
                          gte: new Date(now - WINDOW_PAST_DAYS * 86400000),
                          lte: new Date(now + WINDOW_FUTURE_DAYS * 86400000),
                      },
                  },
                  include: { team: { select: { name: true, timezone: true } } },
                  orderBy: { startTime: 'asc' },
              })
            : [];

        const calendarEvents: CalendarEvent[] = events.map((e) => ({
            id: e.id,
            title: e.title,
            type: e.type,
            description: e.description,
            location: e.location,
            locationUrl: e.locationUrl,
            uniform: e.uniform,
            notes: e.notes,
            startTime: e.startTime,
            endTime: e.endTime,
            isCancelled: e.isCancelled,
            updatedAt: e.updatedAt,
            opponentName: e.opponentName,
            homeScore: e.homeScore,
            awayScore: e.awayScore,
            timezone: e.timezone || e.team.timezone || user.timezone || DEFAULT_TIMEZONE,
            teamName: e.team.name,
        }));

        const scopedTeamName =
            teamFilter && events.length > 0 ? events[0].team.name : `${user.name}'s teams`;

        const body = buildCalendar({
            events: calendarEvents,
            calendarName: `HuddleBase — ${scopedTeamName}`,
        });

        return new NextResponse(body, {
            status: 200,
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': 'inline; filename="huddlebase.ics"',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                // The URL is a bearer credential; keep it out of search indexes.
                'X-Robots-Tag': 'noindex, nofollow',
            },
        });
    } catch (error) {
        console.error('Calendar feed error:', error);
        return new NextResponse('Internal error', { status: 500 });
    }
}
