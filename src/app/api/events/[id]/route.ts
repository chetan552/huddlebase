import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { eventCancelledEmail } from '@/lib/email';
import { isTeamStaff } from '@/lib/permissions';
import { notifyTeam } from '@/lib/notify';
import { parseWallTime, DEFAULT_TIMEZONE, isValidTimeZone } from '@/lib/timezone';
import { serializeEvent } from '@/lib/events';

/** Which occurrences of a recurring series an edit or delete applies to. */
type Scope = 'THIS' | 'FUTURE' | 'ALL';
const SCOPES: Scope[] = ['THIS', 'FUTURE', 'ALL'];

function parseOptionalScore(value: unknown): number | null {
    if (value === undefined || value === null || value === '') return null;
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : Number.NaN;
}

/**
 * Rows the requested scope covers. A non-recurring event, or scope THIS, is always
 * just the one row — `seriesId` is only consulted for FUTURE and ALL.
 */
function scopeFilter(
    event: { id: string; seriesId: string | null; startTime: Date },
    scope: Scope,
): Prisma.EventWhereInput {
    if (scope === 'THIS' || !event.seriesId) return { id: event.id };
    if (scope === 'FUTURE') {
        return { seriesId: event.seriesId, startTime: { gte: event.startTime } };
    }
    return { seriesId: event.seriesId };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                team: { select: { name: true, color: true, timezone: true } },
                venue: {
                    select: {
                        id: true, name: true, address: true, city: true, region: true,
                        postalCode: true, latitude: true, longitude: true, notes: true, mapUrl: true,
                    },
                },
            },
        });

        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }

        const membership = await prisma.teamMember.findFirst({
            where: { userId: user.id, teamId: event.teamId },
            select: { id: true },
        });
        if (!membership && user.role !== 'ADMIN') {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const siblingCount = event.seriesId
            ? await prisma.event.count({ where: { seriesId: event.seriesId } })
            : 1;

        return NextResponse.json({
            success: true,
            data: { ...serializeEvent(event), seriesCount: siblingCount },
        });
    } catch (error) {
        console.error('Fetch event error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch event' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const payload = await req.json();
        const {
            title,
            type,
            location,
            locationUrl,
            description,
            uniform,
            notes,
            startTime,
            endTime,
            timezone,
            isCancelled,
            opponentName,
            homeScore,
            awayScore,
            result,
            venueId,
            scope: rawScope,
        } = payload;

        const scope: Scope = SCOPES.includes(rawScope) ? rawScope : 'THIS';

        if (isCancelled !== undefined && typeof isCancelled !== 'boolean') {
            return NextResponse.json({ success: false, error: 'isCancelled must be a boolean' }, { status: 400 });
        }

        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                team: { select: { name: true, color: true, timezone: true } },
                venue: {
                    select: {
                        id: true, name: true, address: true, city: true, region: true,
                        postalCode: true, latitude: true, longitude: true, notes: true, mapUrl: true,
                    },
                },
            },
        });
        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, event.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        if (timezone !== undefined && timezone !== null && timezone !== '' && !isValidTimeZone(timezone)) {
            return NextResponse.json({ success: false, error: 'Invalid timezone' }, { status: 400 });
        }

        const parsedHomeScore = parseOptionalScore(homeScore);
        const parsedAwayScore = parseOptionalScore(awayScore);
        if (Number.isNaN(parsedHomeScore) || Number.isNaN(parsedAwayScore)) {
            return NextResponse.json({ success: false, error: 'Scores must be whole numbers' }, { status: 400 });
        }

        if (venueId) {
            const venue = await prisma.venue.findFirst({
                where: { id: venueId, teamId: event.teamId },
                select: { id: true },
            });
            if (!venue) {
                return NextResponse.json({ success: false, error: 'Venue not found for this team' }, { status: 404 });
            }
        }

        const zone =
            (timezone !== undefined && timezone) || event.timezone || event.team.timezone || DEFAULT_TIMEZONE;

        // Fields that describe the event itself apply cleanly across a whole series.
        const sharedData: Prisma.EventUpdateManyMutationInput = {
            ...(title !== undefined && { title }),
            ...(type !== undefined && { type }),
            ...(location !== undefined && { location: location || null }),
            ...(locationUrl !== undefined && { locationUrl: locationUrl || null }),
            ...(description !== undefined && { description: description || null }),
            ...(uniform !== undefined && { uniform: uniform || null }),
            ...(notes !== undefined && { notes: notes || null }),
            ...(timezone !== undefined && { timezone: timezone || null }),
            ...(venueId !== undefined && { venueId: venueId || null }),
            ...(isCancelled !== undefined && { isCancelled }),
        };

        // Scores and opponent belong to a single fixture, never to the whole series.
        const occurrenceData: Prisma.EventUpdateInput = {
            ...(opponentName !== undefined && { opponentName: opponentName || null }),
            ...(homeScore !== undefined && { homeScore: parsedHomeScore }),
            ...(awayScore !== undefined && { awayScore: parsedAwayScore }),
            ...(result !== undefined && { result: result || null }),
        };

        let newStart: Date | null = null;
        let newEnd: Date | null | undefined;

        if (startTime !== undefined) {
            newStart = parseWallTime(String(startTime), zone);
            if (!newStart) {
                return NextResponse.json({ success: false, error: 'Invalid start time' }, { status: 400 });
            }
        }
        if (endTime !== undefined) {
            newEnd = endTime ? parseWallTime(String(endTime), zone) : null;
            if (endTime && !newEnd) {
                return NextResponse.json({ success: false, error: 'Invalid end time' }, { status: 400 });
            }
        }

        const effectiveStart = newStart ?? event.startTime;
        const effectiveEnd = newEnd !== undefined ? newEnd : event.endTime;
        if (effectiveEnd && effectiveEnd.getTime() <= effectiveStart.getTime()) {
            return NextResponse.json({ success: false, error: 'End time must be after the start time' }, { status: 400 });
        }

        const where = scopeFilter(event, scope);
        const isSeriesEdit = scope !== 'THIS' && Boolean(event.seriesId);

        await prisma.$transaction(async (tx) => {
            if (Object.keys(sharedData).length > 0) {
                await tx.event.updateMany({ where, data: sharedData });
            }

            if (Object.keys(occurrenceData).length > 0) {
                await tx.event.update({ where: { id: event.id }, data: occurrenceData });
            }

            if (newStart || newEnd !== undefined) {
                if (!isSeriesEdit) {
                    await tx.event.update({
                        where: { id: event.id },
                        data: {
                            ...(newStart && { startTime: newStart }),
                            ...(newEnd !== undefined && { endTime: newEnd }),
                            // Moving one occurrence detaches it from the series pattern
                            // so a later "edit all" doesn't drag it back.
                            ...(event.seriesId && newStart ? { seriesId: event.seriesId } : {}),
                        },
                    });
                } else {
                    // Shift every in-scope occurrence by the same delta, preserving the
                    // spacing of the series rather than stacking them on one date.
                    const deltaMs = newStart ? newStart.getTime() - event.startTime.getTime() : 0;
                    const durationMs =
                        newEnd !== undefined && newEnd
                            ? newEnd.getTime() - effectiveStart.getTime()
                            : null;

                    const siblings = await tx.event.findMany({
                        where,
                        select: { id: true, startTime: true, endTime: true },
                    });

                    for (const sibling of siblings) {
                        const shiftedStart = new Date(sibling.startTime.getTime() + deltaMs);
                        const shiftedEnd =
                            durationMs !== null
                                ? new Date(shiftedStart.getTime() + durationMs)
                                : sibling.endTime
                                  ? new Date(sibling.endTime.getTime() + deltaMs)
                                  : null;
                        await tx.event.update({
                            where: { id: sibling.id },
                            data: { startTime: shiftedStart, endTime: shiftedEnd },
                        });
                    }
                }
            }
        });

        const updated = await prisma.event.findUnique({
            where: { id: event.id },
            include: {
                team: { select: { name: true, color: true, timezone: true } },
                venue: {
                    select: {
                        id: true, name: true, address: true, city: true, region: true,
                        postalCode: true, latitude: true, longitude: true, notes: true, mapUrl: true,
                    },
                },
            },
        });

        if (isCancelled) {
            const affected = await prisma.event.count({ where });
            const scopeNote = affected > 1 ? ` (${affected} dates)` : '';
            await notifyTeam(event.teamId, {
                exceptUserId: user.id,
                type: 'CANCELLED_EVENT',
                title: `Cancelled: ${event.title}`,
                body: `${user.name} cancelled the ${event.type.toLowerCase()} on ${event.team.name}${scopeNote}`,
                link: '/schedule',
                emailSubject: `Cancelled: ${event.title}`,
                emailHtml: eventCancelledEmail({
                    eventTitle: event.title,
                    eventType: event.type,
                    teamName: event.team.name,
                    startTime: event.startTime.toISOString(),
                }),
            });
        }

        return NextResponse.json({ success: true, data: updated ? serializeEvent(updated) : null });
    } catch (error) {
        console.error('Update event error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update event' }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const { searchParams } = new URL(req.url);
        const rawScope = searchParams.get('scope');
        const scope: Scope = SCOPES.includes(rawScope as Scope) ? (rawScope as Scope) : 'THIS';

        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) {
            return NextResponse.json({ success: false, error: 'Event not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, event.teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        // RSVPs, attendance, stats and volunteer needs cascade from the Event rows.
        const deleted = await prisma.event.deleteMany({ where: scopeFilter(event, scope) });

        return NextResponse.json({ success: true, data: { deleted: deleted.count } });
    } catch (error) {
        console.error('Delete event error:', error);
        return NextResponse.json({ success: false, error: 'Failed to delete event' }, { status: 500 });
    }
}
