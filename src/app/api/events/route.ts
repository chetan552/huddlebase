import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { eventCreatedEmail } from '@/lib/email';
import { isTeamStaff } from '@/lib/permissions';
import { notifyUsers } from '@/lib/notify';
import { parseWallTime, DEFAULT_TIMEZONE, isValidTimeZone } from '@/lib/timezone';
import { parseRecurrenceRule, expandRecurrence, describeRecurrence } from '@/lib/recurrence';
import { applyAvailabilityToEvents } from '@/lib/availability';
import { serializeEvent } from '@/lib/events';

function parseOptionalScore(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : Number.NaN;
}

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

        const { searchParams } = new URL(req.url);
        const teamFilter = searchParams.get('teamId');
        const from = searchParams.get('from');
        const to = searchParams.get('to');

        if (teamFilter && !teamIds.includes(teamFilter)) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const startWindow: { gte?: Date; lte?: Date } = {};
        if (from && !Number.isNaN(new Date(from).getTime())) startWindow.gte = new Date(from);
        if (to && !Number.isNaN(new Date(to).getTime())) startWindow.lte = new Date(to);

        const events = await prisma.event.findMany({
            where: {
                teamId: teamFilter ? teamFilter : { in: teamIds },
                ...(Object.keys(startWindow).length > 0 && { startTime: startWindow }),
            },
            include: {
                team: { select: { name: true, color: true, timezone: true } },
                venue: {
                    select: {
                        id: true, name: true, address: true, city: true, region: true,
                        postalCode: true, latitude: true, longitude: true, notes: true, mapUrl: true,
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        return NextResponse.json({ success: true, data: events.map(serializeEvent) });
    } catch (error) {
        console.error('Fetch events error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch events' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const {
            title,
            type,
            teamId,
            location,
            locationUrl,
            startTime,
            endTime,
            notes,
            description,
            uniform,
            opponentName,
            homeScore,
            awayScore,
            result,
            recurrence,
            timezone,
            venueId,
        } = await req.json();

        if (!title || !teamId || !startTime) {
            return NextResponse.json({ success: false, error: 'Title, team, and start time are required' }, { status: 400 });
        }

        if (!(await isTeamStaff(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can create events' }, { status: 403 });
        }

        const team = await prisma.team.findUnique({
            where: { id: teamId },
            select: { name: true, color: true, timezone: true },
        });
        if (!team) {
            return NextResponse.json({ success: false, error: 'Team not found' }, { status: 404 });
        }

        // An event may override the team zone for a game played in another region.
        if (timezone && !isValidTimeZone(timezone)) {
            return NextResponse.json({ success: false, error: 'Invalid timezone' }, { status: 400 });
        }
        const zone = timezone || team.timezone || DEFAULT_TIMEZONE;

        // Times arrive as zone-less wall clock from the web form and are interpreted
        // against the team's zone. Mobile sends fully-qualified instants, which pass through.
        const start = parseWallTime(String(startTime), zone);
        if (!start) {
            return NextResponse.json({ success: false, error: 'Invalid start time' }, { status: 400 });
        }
        const end = endTime ? parseWallTime(String(endTime), zone) : null;
        if (endTime && !end) {
            return NextResponse.json({ success: false, error: 'Invalid end time' }, { status: 400 });
        }
        if (end && end.getTime() <= start.getTime()) {
            return NextResponse.json({ success: false, error: 'End time must be after the start time' }, { status: 400 });
        }

        const parsedHomeScore = parseOptionalScore(homeScore);
        const parsedAwayScore = parseOptionalScore(awayScore);
        if (Number.isNaN(parsedHomeScore) || Number.isNaN(parsedAwayScore)) {
            return NextResponse.json({ success: false, error: 'Scores must be whole numbers' }, { status: 400 });
        }

        // A venue must belong to the same team, or the event would surface another
        // team's saved address.
        if (venueId) {
            const venue = await prisma.venue.findFirst({
                where: { id: venueId, teamId },
                select: { id: true },
            });
            if (!venue) {
                return NextResponse.json({ success: false, error: 'Venue not found for this team' }, { status: 404 });
            }
        }

        const { rule, error: ruleError } = parseRecurrenceRule(recurrence);
        if (ruleError) {
            return NextResponse.json({ success: false, error: ruleError }, { status: 400 });
        }

        const durationMs = end ? end.getTime() - start.getTime() : null;
        const startTimes = rule ? expandRecurrence(start, rule, zone) : [start];
        const seriesId = rule ? crypto.randomUUID() : null;

        const shared = {
            title,
            type: type || 'PRACTICE',
            teamId,
            location: location || null,
            locationUrl: locationUrl || null,
            description: description || null,
            uniform: uniform || null,
            notes: notes || null,
            opponentName: opponentName || null,
            homeScore: parsedHomeScore,
            awayScore: parsedAwayScore,
            result: result || null,
            timezone: timezone || null,
            venueId: venueId || null,
            isRecurring: Boolean(rule),
            recurrence: rule ? JSON.stringify(rule) : null,
            seriesId,
        };

        await prisma.event.createMany({
            data: startTimes.map((occurrenceStart) => ({
                ...shared,
                startTime: occurrenceStart,
                endTime: durationMs === null ? null : new Date(occurrenceStart.getTime() + durationMs),
            })),
        });

        const created = await prisma.event.findMany({
            where: seriesId ? { seriesId } : { teamId, startTime: start, title },
            include: {
                team: { select: { name: true, color: true, timezone: true } },
                venue: {
                    select: {
                        id: true, name: true, address: true, city: true, region: true,
                        postalCode: true, latitude: true, longitude: true, notes: true, mapUrl: true,
                    },
                },
            },
            orderBy: { startTime: 'asc' },
        });

        // A family already marked away for these dates gets their RSVPs pre-filled.
        await applyAvailabilityToEvents(created.map((e) => ({ id: e.id, teamId: e.teamId, startTime: e.startTime })));

        const members = await prisma.teamMember.findMany({
            where: { teamId, userId: { not: user.id } },
            include: { user: { select: { id: true, email: true } } },
        });

        if (members.length > 0) {
            const recurrenceNote = rule ? ` (${describeRecurrence(rule)})` : '';
            await notifyUsers({
                userIds: members.map((m) => m.userId),
                type: 'NEW_EVENT',
                title: `New ${(type || 'PRACTICE').toLowerCase()}: ${title}`,
                body: `${user.name} added a new event to ${team.name}${recurrenceNote}`,
                link: '/schedule',
                emailSubject: `New ${(type || 'PRACTICE').toLowerCase()}: ${title}`,
                emailHtml: eventCreatedEmail({
                    eventTitle: title,
                    eventType: type || 'PRACTICE',
                    teamName: team.name,
                    startTime: start.toISOString(),
                    location: location || null,
                }),
            });
        }

        return NextResponse.json(
            {
                success: true,
                data: serializeEvent(created[0]),
                meta: { occurrencesCreated: created.length, seriesId },
            },
            { status: 201 },
        );
    } catch (error) {
        console.error('Create event error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create event' }, { status: 500 });
    }
}
