/**
 * Recurring event expansion.
 *
 * Occurrences are materialised into real Event rows rather than computed on read,
 * so RSVPs, attendance and stats attach to a specific date the same way they do
 * for one-off events. All date arithmetic runs in the team's timezone so a 6pm
 * practice stays at 6pm across a DST change.
 */

import { addDaysInZone, addMonthsInZone, weekdayInZone } from './timezone';

export const MAX_OCCURRENCES = 260; // ~5 years of weekly practices
export const MAX_HORIZON_DAYS = 730;

export type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';

export interface RecurrenceRule {
    frequency: Frequency;
    /** Repeat every N periods. Defaults to 1. */
    interval: number;
    /** WEEKLY/BIWEEKLY only: days to repeat on, 0 = Sunday. Defaults to the start day. */
    weekdays?: number[];
    /** Stop after N occurrences, counting the first. Mutually exclusive with `until`. */
    count?: number;
    /** Stop on or before this date (ISO date or datetime). */
    until?: string;
}

const FREQUENCIES: Frequency[] = ['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'];

export interface ParsedRule {
    rule: RecurrenceRule | null;
    error: string | null;
}

/**
 * Validate a client-supplied recurrence rule. Returns `{ rule: null, error: null }`
 * when no recurrence was requested, so callers can distinguish absent from invalid.
 */
export function parseRecurrenceRule(input: unknown): ParsedRule {
    if (input === undefined || input === null || input === '') {
        return { rule: null, error: null };
    }

    let raw: unknown = input;
    if (typeof raw === 'string') {
        try {
            raw = JSON.parse(raw);
        } catch {
            return { rule: null, error: 'Recurrence must be valid JSON' };
        }
    }

    if (typeof raw !== 'object' || raw === null) {
        return { rule: null, error: 'Recurrence must be an object' };
    }

    const candidate = raw as Record<string, unknown>;
    const frequency = String(candidate.frequency ?? '').toUpperCase() as Frequency;

    if (!FREQUENCIES.includes(frequency)) {
        return { rule: null, error: `Frequency must be one of ${FREQUENCIES.join(', ')}` };
    }

    const interval = candidate.interval === undefined ? 1 : Number(candidate.interval);
    if (!Number.isInteger(interval) || interval < 1 || interval > 52) {
        return { rule: null, error: 'Interval must be a whole number between 1 and 52' };
    }

    let weekdays: number[] | undefined;
    if (candidate.weekdays !== undefined && candidate.weekdays !== null) {
        if (!Array.isArray(candidate.weekdays)) {
            return { rule: null, error: 'Weekdays must be an array' };
        }
        weekdays = Array.from(
            new Set(candidate.weekdays.map((d) => Number(d))),
        ).sort((a, b) => a - b);
        if (weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
            return { rule: null, error: 'Weekdays must be integers from 0 (Sunday) to 6' };
        }
        if (weekdays.length === 0) weekdays = undefined;
    }

    let count: number | undefined;
    if (candidate.count !== undefined && candidate.count !== null && candidate.count !== '') {
        count = Number(candidate.count);
        if (!Number.isInteger(count) || count < 1 || count > MAX_OCCURRENCES) {
            return { rule: null, error: `Count must be a whole number between 1 and ${MAX_OCCURRENCES}` };
        }
    }

    let until: string | undefined;
    if (candidate.until !== undefined && candidate.until !== null && candidate.until !== '') {
        const parsed = new Date(String(candidate.until));
        if (Number.isNaN(parsed.getTime())) {
            return { rule: null, error: 'Until must be a valid date' };
        }
        until = String(candidate.until);
    }

    if (count === undefined && until === undefined) {
        return { rule: null, error: 'Recurring events need either an end date or an occurrence count' };
    }

    return { rule: { frequency, interval, weekdays, count, until }, error: null };
}

/**
 * Expand a rule into concrete start instants, always including `start` itself.
 *
 * Bounded twice over: by `MAX_OCCURRENCES` and by a two-year horizon, so a
 * malformed or open-ended rule can't generate unbounded rows.
 */
export function expandRecurrence(
    start: Date,
    rule: RecurrenceRule,
    timeZone: string,
): Date[] {
    const horizon = addDaysInZone(start, MAX_HORIZON_DAYS, timeZone).getTime();
    const untilTs = rule.until ? new Date(rule.until).getTime() : null;

    // A bare `until` date ("2026-12-31") means through the end of that day.
    const untilBound =
        untilTs !== null && /^\d{4}-\d{2}-\d{2}$/.test(rule.until!.trim())
            ? untilTs + 24 * 60 * 60 * 1000 - 1
            : untilTs;

    const limit = Math.min(rule.count ?? MAX_OCCURRENCES, MAX_OCCURRENCES);
    const occurrences: Date[] = [];

    const withinBounds = (d: Date) =>
        d.getTime() <= horizon && (untilBound === null || d.getTime() <= untilBound);

    if (rule.frequency === 'WEEKLY' || rule.frequency === 'BIWEEKLY') {
        const stepWeeks = rule.frequency === 'BIWEEKLY' ? 2 * rule.interval : rule.interval;
        const startWeekday = weekdayInZone(start, timeZone);
        const days = rule.weekdays?.length ? rule.weekdays : [startWeekday];

        // Anchor on the Sunday of the start's week, then walk week by week.
        let weekAnchor = addDaysInZone(start, -startWeekday, timeZone);

        while (occurrences.length < limit) {
            let addedThisWeek = false;

            for (const weekday of days) {
                const candidate = addDaysInZone(weekAnchor, weekday, timeZone);
                // Never emit before the series start, even if an earlier weekday
                // was selected in the first week.
                if (candidate.getTime() < start.getTime()) continue;
                if (!withinBounds(candidate)) continue;
                if (occurrences.length >= limit) break;
                occurrences.push(candidate);
                addedThisWeek = true;
            }

            const nextAnchor = addDaysInZone(weekAnchor, stepWeeks * 7, timeZone);
            // Stop once we're past every bound and produced nothing — otherwise a
            // far-future `until` with no matching weekday would spin.
            if (!addedThisWeek && nextAnchor.getTime() > horizon) break;
            if (untilBound !== null && nextAnchor.getTime() > untilBound) break;
            if (nextAnchor.getTime() > horizon) break;
            weekAnchor = nextAnchor;
        }

        return occurrences.sort((a, b) => a.getTime() - b.getTime()).slice(0, limit);
    }

    // Monthly steps are measured from the original start, not the previous
    // occurrence, so a clamped short month doesn't drag the whole series with it:
    // Jan 31 -> Feb 28 -> Mar 31, never Mar 28.
    let step = 0;
    let cursor = start;
    while (occurrences.length < limit && withinBounds(cursor)) {
        occurrences.push(cursor);
        step += 1;
        cursor =
            rule.frequency === 'MONTHLY'
                ? addMonthsInZone(start, rule.interval * step, timeZone)
                : addDaysInZone(start, rule.interval * step, timeZone);
    }

    return occurrences;
}

/** Human-readable summary for list rows and emails. */
export function describeRecurrence(rule: RecurrenceRule): string {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const every = rule.interval > 1 ? ` every ${rule.interval}` : '';

    let base: string;
    switch (rule.frequency) {
        case 'DAILY':
            base = rule.interval > 1 ? `Every ${rule.interval} days` : 'Daily';
            break;
        case 'MONTHLY':
            base = rule.interval > 1 ? `Every ${rule.interval} months` : 'Monthly';
            break;
        case 'BIWEEKLY':
            base = 'Every other week';
            break;
        default:
            base = rule.interval > 1 ? `Every${every} weeks` : 'Weekly';
    }

    if (rule.weekdays?.length) {
        base += ` on ${rule.weekdays.map((d) => dayNames[d]).join(', ')}`;
    }
    if (rule.count) {
        base += `, ${rule.count} times`;
    } else if (rule.until) {
        base += `, until ${new Date(rule.until).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
        })}`;
    }

    return base;
}
