/**
 * Timezone helpers.
 *
 * Events are stored as UTC instants, but coaches author them in wall-clock time
 * ("Tuesday 6:00pm") against their team's IANA zone. Everything here exists to
 * convert between those two views without pulling in a date library.
 */

export const DEFAULT_TIMEZONE = 'America/New_York';

/** Zones offered in the team settings picker. Any valid IANA zone is accepted. */
export const COMMON_TIMEZONES = [
    { value: 'America/New_York', label: 'Eastern Time (New York)' },
    { value: 'America/Chicago', label: 'Central Time (Chicago)' },
    { value: 'America/Denver', label: 'Mountain Time (Denver)' },
    { value: 'America/Phoenix', label: 'Mountain Time - no DST (Phoenix)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (Los Angeles)' },
    { value: 'America/Anchorage', label: 'Alaska Time (Anchorage)' },
    { value: 'Pacific/Honolulu', label: 'Hawaii Time (Honolulu)' },
    { value: 'America/Toronto', label: 'Eastern Time (Toronto)' },
    { value: 'America/Vancouver', label: 'Pacific Time (Vancouver)' },
    { value: 'America/Mexico_City', label: 'Central Time (Mexico City)' },
    { value: 'Europe/London', label: 'United Kingdom (London)' },
    { value: 'Europe/Dublin', label: 'Ireland (Dublin)' },
    { value: 'Europe/Paris', label: 'Central European (Paris)' },
    { value: 'Europe/Berlin', label: 'Central European (Berlin)' },
    { value: 'Europe/Madrid', label: 'Central European (Madrid)' },
    { value: 'Australia/Sydney', label: 'Eastern Australia (Sydney)' },
    { value: 'Australia/Perth', label: 'Western Australia (Perth)' },
    { value: 'Pacific/Auckland', label: 'New Zealand (Auckland)' },
    { value: 'Asia/Tokyo', label: 'Japan (Tokyo)' },
    { value: 'Asia/Singapore', label: 'Singapore' },
    { value: 'Asia/Kolkata', label: 'India (Kolkata)' },
    { value: 'Asia/Dubai', label: 'Gulf (Dubai)' },
    { value: 'UTC', label: 'UTC' },
] as const;

export function isValidTimeZone(timeZone: string): boolean {
    if (!timeZone || typeof timeZone !== 'string') return false;
    try {
        new Intl.DateTimeFormat('en-US', { timeZone });
        return true;
    } catch {
        return false;
    }
}

export interface WallTimeParts {
    year: number;
    month: number; // 1-12
    day: number;
    hour: number;
    minute: number;
    second: number;
}

/**
 * How far ahead of UTC `timeZone` is at the given instant, in milliseconds.
 * Positive east of Greenwich. Accounts for DST because it asks Intl about that
 * specific instant rather than assuming a fixed offset.
 */
function offsetMsAt(instant: Date, timeZone: string): number {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour12: false,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    }).formatToParts(instant);

    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');

    // Some ICU builds emit hour "24" for midnight instead of "00".
    const asIfUtc = Date.UTC(
        get('year'),
        get('month') - 1,
        get('day'),
        get('hour') % 24,
        get('minute'),
        get('second'),
    );

    return asIfUtc - instant.getTime();
}

/** Split a UTC instant into the wall-clock fields a viewer in `timeZone` sees. */
export function toWallTimeParts(instant: Date, timeZone: string): WallTimeParts {
    const zone = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
    const shifted = new Date(instant.getTime() + offsetMsAt(instant, zone));
    return {
        year: shifted.getUTCFullYear(),
        month: shifted.getUTCMonth() + 1,
        day: shifted.getUTCDate(),
        hour: shifted.getUTCHours(),
        minute: shifted.getUTCMinutes(),
        second: shifted.getUTCSeconds(),
    };
}

/**
 * Turn wall-clock fields in `timeZone` into the UTC instant they name.
 *
 * The offset we need depends on the answer we're solving for, so we guess with
 * the offset at the naive timestamp and verify by converting back. Near a DST
 * boundary the two candidate offsets disagree and we keep whichever actually
 * round-trips, rather than iterating blindly — a second blind pass oscillates
 * and lands an hour early inside a spring-forward gap.
 *
 * The two irregular cases resolve the way calendar apps do:
 *  - Ambiguous (fall-back, 1:30am twice): the first/earlier occurrence.
 *  - Nonexistent (spring-forward gap, 2:30am): shifted forward past the jump.
 */
export function wallTimePartsToUtc(parts: WallTimeParts, timeZone: string): Date {
    const zone = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
    const naive = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        parts.hour,
        parts.minute,
        parts.second,
    );

    const firstOffset = offsetMsAt(new Date(naive), zone);
    const candidate = naive - firstOffset;
    const secondOffset = offsetMsAt(new Date(candidate), zone);

    // Same offset on both sides: not near a transition, so this is exact.
    if (firstOffset === secondOffset) return new Date(candidate);

    const alternate = naive - secondOffset;
    const matchesRequest = (instant: number) => {
        const w = toWallTimeParts(new Date(instant), zone);
        return (
            w.year === parts.year &&
            w.month === parts.month &&
            w.day === parts.day &&
            w.hour === parts.hour &&
            w.minute === parts.minute
        );
    };

    if (matchesRequest(candidate)) return new Date(candidate);
    if (matchesRequest(alternate)) return new Date(alternate);

    // Neither round-trips: the requested wall time falls in a spring-forward gap
    // and does not exist. Take the later candidate so we land after the jump.
    return new Date(Math.max(candidate, alternate));
}

/**
 * Parse a zone-less datetime string, as produced by `<input type="datetime-local">`,
 * against a team's timezone.
 *
 * A string that already carries a zone ("Z" or "+05:30") is unambiguous and is
 * passed straight through — this is what mobile clients send.
 */
export function parseWallTime(value: string, timeZone: string): Date | null {
    if (!value || typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (/[zZ]$/.test(trimmed) || /[+-]\d{2}:?\d{2}$/.test(trimmed)) {
        const explicit = new Date(trimmed);
        return Number.isNaN(explicit.getTime()) ? null : explicit;
    }

    const match = trimmed.match(
        /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/,
    );
    if (!match) {
        const fallback = new Date(trimmed);
        return Number.isNaN(fallback.getTime()) ? null : fallback;
    }

    return wallTimePartsToUtc(
        {
            year: Number(match[1]),
            month: Number(match[2]),
            day: Number(match[3]),
            hour: Number(match[4]),
            minute: Number(match[5]),
            second: Number(match[6] ?? '0'),
        },
        timeZone,
    );
}

/**
 * Shift an instant by whole days while holding the wall-clock time steady.
 * A 6:00pm practice stays 6:00pm across a DST change instead of drifting to 5 or 7.
 */
export function addDaysInZone(instant: Date, days: number, timeZone: string): Date {
    const parts = toWallTimeParts(instant, timeZone);
    // Normalise month overflow (e.g. Jan 33) through the UTC calendar first.
    const rolled = new Date(
        Date.UTC(parts.year, parts.month - 1, parts.day + days, parts.hour, parts.minute, parts.second),
    );
    return wallTimePartsToUtc(
        {
            year: rolled.getUTCFullYear(),
            month: rolled.getUTCMonth() + 1,
            day: rolled.getUTCDate(),
            hour: parts.hour,
            minute: parts.minute,
            second: parts.second,
        },
        timeZone,
    );
}

/** Same as addDaysInZone but stepping whole months, clamping short months (Jan 31 -> Feb 28). */
export function addMonthsInZone(instant: Date, months: number, timeZone: string): Date {
    const parts = toWallTimeParts(instant, timeZone);
    const targetMonthIndex = parts.month - 1 + months;
    const targetYear = parts.year + Math.floor(targetMonthIndex / 12);
    const normalisedMonth = ((targetMonthIndex % 12) + 12) % 12;
    const daysInTargetMonth = new Date(Date.UTC(targetYear, normalisedMonth + 1, 0)).getUTCDate();

    return wallTimePartsToUtc(
        {
            year: targetYear,
            month: normalisedMonth + 1,
            day: Math.min(parts.day, daysInTargetMonth),
            hour: parts.hour,
            minute: parts.minute,
            second: parts.second,
        },
        timeZone,
    );
}

/** Day of week in the target zone, 0 = Sunday. */
export function weekdayInZone(instant: Date, timeZone: string): number {
    const parts = toWallTimeParts(instant, timeZone);
    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

/** Format an instant for display in a specific zone. */
export function formatInTimeZone(
    instant: Date,
    timeZone: string,
    options: Intl.DateTimeFormatOptions = {},
): string {
    const zone = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
    return new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        dateStyle: 'medium',
        timeStyle: 'short',
        ...options,
    }).format(instant);
}

/** Short zone label ("EDT", "PST") for appending to displayed times. */
export function timeZoneAbbreviation(instant: Date, timeZone: string): string {
    const zone = isValidTimeZone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: zone,
        timeZoneName: 'short',
    }).formatToParts(instant);
    return parts.find((p) => p.type === 'timeZoneName')?.value ?? '';
}

/**
 * Render an instant as the local-time value an `<input type="datetime-local">`
 * expects, in the given zone.
 */
export function toDateTimeLocalValue(instant: Date, timeZone: string): string {
    const p = toWallTimeParts(instant, timeZone);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** The viewer's own zone, for highlighting when an event is in a different one. */
export function browserTimeZone(): string {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
    } catch {
        return DEFAULT_TIMEZONE;
    }
}
