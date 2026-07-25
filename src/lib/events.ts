import { DEFAULT_TIMEZONE, timeZoneAbbreviation } from './timezone';
import { directionsUrl, formatVenueAddress, type VenueLike } from './venues';

/** The shape event API routes return. Keep additive — the web and mobile clients both read it. */
export interface SerializedEvent {
    id: string;
    title: string;
    type: string;
    startTime: string;
    endTime: string | null;
    timezone: string;
    timezoneLabel: string;
    location: string | null;
    locationUrl: string | null;
    description: string | null;
    uniform: string | null;
    notes: string | null;
    teamId: string;
    teamName: string;
    teamColor: string;
    isCancelled: boolean;
    isRecurring: boolean;
    seriesId: string | null;
    recurrence: unknown | null;
    opponentName: string | null;
    homeScore: number | null;
    awayScore: number | null;
    result: string | null;
    venueId: string | null;
    venueName: string | null;
    venueAddress: string | null;
    venueNotes: string | null;
    directionsUrl: string | null;
}

interface EventWithTeam {
    id: string;
    title: string;
    type: string;
    startTime: Date;
    endTime: Date | null;
    timezone: string | null;
    location: string | null;
    locationUrl: string | null;
    description: string | null;
    uniform: string | null;
    notes: string | null;
    teamId: string;
    isCancelled: boolean;
    isRecurring: boolean;
    seriesId: string | null;
    recurrence: string | null;
    opponentName: string | null;
    homeScore: number | null;
    awayScore: number | null;
    result: string | null;
    venueId?: string | null;
    team: { name: string; color: string; timezone: string | null };
    venue?: (VenueLike & { id: string; notes: string | null }) | null;
}

/**
 * Flatten an event row for the API. Resolves the effective timezone (event override,
 * else team, else default) so clients never have to work that out themselves.
 */
export function serializeEvent(event: EventWithTeam): SerializedEvent {
    const zone = event.timezone || event.team.timezone || DEFAULT_TIMEZONE;

    let recurrence: unknown = null;
    if (event.recurrence) {
        try {
            recurrence = JSON.parse(event.recurrence);
        } catch {
            recurrence = null;
        }
    }

    const venue = event.venue ?? null;

    return {
        id: event.id,
        title: event.title,
        type: event.type,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime?.toISOString() ?? null,
        timezone: zone,
        timezoneLabel: timeZoneAbbreviation(event.startTime, zone),
        // A linked venue supplies the display location; free-text `location` is the
        // fallback for one-off addresses and every event created before venues existed.
        location: venue?.name ?? event.location,
        locationUrl: event.locationUrl,
        venueId: venue?.id ?? null,
        venueName: venue?.name ?? null,
        venueAddress: venue ? formatVenueAddress(venue) : null,
        venueNotes: venue?.notes ?? null,
        directionsUrl: venue ? directionsUrl(venue) : event.locationUrl,
        description: event.description,
        uniform: event.uniform,
        notes: event.notes,
        teamId: event.teamId,
        teamName: event.team.name,
        teamColor: event.team.color,
        isCancelled: event.isCancelled,
        isRecurring: event.isRecurring,
        seriesId: event.seriesId,
        recurrence,
        opponentName: event.opponentName,
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        result: event.result,
    };
}
