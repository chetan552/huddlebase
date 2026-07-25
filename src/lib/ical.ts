/**
 * iCalendar (RFC 5545) feed generation.
 *
 * Emits a VCALENDAR that Apple Calendar, Google Calendar and Outlook can subscribe
 * to. Times are written as UTC instants (`...Z`), which every client renders in the
 * viewer's own zone — no VTIMEZONE blocks needed, and travel games stay correct.
 */

import { formatInTimeZone } from './timezone';

const PRODID = '-//HuddleBase//Team Calendar//EN';
const LINE_LIMIT = 75;

/** Escape per RFC 5545 §3.3.11: backslash, semicolon, comma and newline are special. */
function escapeText(value: string): string {
    return value
        .replace(/\\/g, '\\\\')
        .replace(/;/g, '\\;')
        .replace(/,/g, '\\,')
        .replace(/\r?\n/g, '\\n');
}

/**
 * Fold long lines to 75 octets per RFC 5545 §3.1.
 *
 * Folding counts bytes, not characters, so we measure UTF-8 length — an emoji in an
 * event title would otherwise push a line over the limit and break strict parsers.
 */
function foldLine(line: string): string {
    const bytes = Buffer.from(line, 'utf-8');
    if (bytes.length <= LINE_LIMIT) return line;

    const parts: string[] = [];
    let start = 0;
    let limit = LINE_LIMIT;

    while (start < bytes.length) {
        let end = Math.min(start + limit, bytes.length);
        // Don't split inside a multi-byte character: continuation bytes are 10xxxxxx.
        while (end > start && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
        parts.push(bytes.subarray(start, end).toString('utf-8'));
        start = end;
        limit = LINE_LIMIT - 1; // continuation lines start with a space
    }

    return parts.join('\r\n ');
}

function formatUtc(date: Date): string {
    return `${date.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

export interface CalendarEvent {
    id: string;
    title: string;
    type: string;
    description: string | null;
    location: string | null;
    locationUrl: string | null;
    uniform: string | null;
    notes: string | null;
    startTime: Date;
    endTime: Date | null;
    isCancelled: boolean;
    updatedAt: Date;
    opponentName: string | null;
    homeScore: number | null;
    awayScore: number | null;
    timezone: string;
    teamName: string;
}

function buildDescription(event: CalendarEvent): string {
    const lines: string[] = [];
    if (event.description) lines.push(event.description);
    if (event.opponentName) lines.push(`Opponent: ${event.opponentName}`);
    if (event.homeScore !== null && event.awayScore !== null) {
        lines.push(`Final: ${event.homeScore}-${event.awayScore}`);
    }
    if (event.uniform) lines.push(`Uniform: ${event.uniform}`);
    if (event.notes) lines.push(`Notes: ${event.notes}`);
    lines.push(
        `Local start: ${formatInTimeZone(event.startTime, event.timezone)} (${event.timezone})`,
    );
    if (event.locationUrl) lines.push(`Map: ${event.locationUrl}`);
    return lines.join('\n');
}

/**
 * Build the full calendar document.
 *
 * `calendarName` shows up as the subscription's name in the client. Cancelled events
 * are kept with STATUS:CANCELLED rather than dropped, so subscribers see the change
 * instead of the entry silently vanishing.
 */
export function buildCalendar({
    events,
    calendarName,
    domain = 'huddlebase.com',
}: {
    events: CalendarEvent[];
    calendarName: string;
    domain?: string;
}): string {
    const now = formatUtc(new Date());

    const lines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        `PRODID:${PRODID}`,
        'CALSCALE:GREGORIAN',
        'METHOD:PUBLISH',
        `X-WR-CALNAME:${escapeText(calendarName)}`,
        `X-WR-CALDESC:${escapeText(`${calendarName} schedule from HuddleBase`)}`,
        // Hint to clients about how often to re-poll. Most honour one or the other.
        'X-PUBLISHED-TTL:PT1H',
        'REFRESH-INTERVAL;VALUE=DURATION:PT1H',
    ];

    for (const event of events) {
        // Default to a one-hour block when no end time was set, so clients don't
        // render the event as an all-day entry.
        const end = event.endTime ?? new Date(event.startTime.getTime() + 60 * 60 * 1000);
        const summary = event.isCancelled ? `CANCELLED: ${event.title}` : event.title;

        lines.push(
            'BEGIN:VEVENT',
            `UID:${event.id}@${domain}`,
            `DTSTAMP:${now}`,
            `DTSTART:${formatUtc(event.startTime)}`,
            `DTEND:${formatUtc(end)}`,
            `SUMMARY:${escapeText(summary)}`,
            `DESCRIPTION:${escapeText(buildDescription(event))}`,
            `CATEGORIES:${escapeText(event.type)}`,
            `LAST-MODIFIED:${formatUtc(event.updatedAt)}`,
            `STATUS:${event.isCancelled ? 'CANCELLED' : 'CONFIRMED'}`,
            `TRANSP:${event.isCancelled ? 'TRANSPARENT' : 'OPAQUE'}`,
        );

        if (event.location) {
            lines.push(`LOCATION:${escapeText(event.location)}`);
        }
        if (event.locationUrl) {
            lines.push(`URL:${escapeText(event.locationUrl)}`);
        }
        if (!event.isCancelled) {
            // One-hour heads-up, matching what most teams expect by default.
            lines.push(
                'BEGIN:VALARM',
                'ACTION:DISPLAY',
                'TRIGGER:-PT1H',
                `DESCRIPTION:${escapeText(summary)}`,
                'END:VALARM',
            );
        }

        lines.push('END:VEVENT');
    }

    lines.push('END:VCALENDAR');

    return lines.map(foldLine).join('\r\n') + '\r\n';
}
