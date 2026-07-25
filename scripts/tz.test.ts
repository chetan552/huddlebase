/**
 * Regression tests for timezone and recurrence maths.
 * Run with: npm run test:dates
 */
import { parseWallTime, addDaysInZone, toWallTimeParts, wallTimePartsToUtc, formatInTimeZone, toDateTimeLocalValue, addMonthsInZone } from '../src/lib/timezone';

let fail = 0;
function eq(label: string, actual: unknown, expected: unknown) {
  const ok = String(actual) === String(expected);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}\n      got=${actual}\n      exp=${expected}`);
}

// 6:30pm EDT on 2026-08-14 == 22:30 UTC
eq('EDT summer', parseWallTime('2026-08-14T18:30', 'America/New_York')!.toISOString(), '2026-08-14T22:30:00.000Z');
// 6:30pm EST on 2026-01-14 == 23:30 UTC
eq('EST winter', parseWallTime('2026-01-14T18:30', 'America/New_York')!.toISOString(), '2026-01-14T23:30:00.000Z');
// Explicit-zone string passes through untouched
eq('explicit Z', parseWallTime('2026-08-14T22:30:00Z', 'America/New_York')!.toISOString(), '2026-08-14T22:30:00.000Z');
eq('explicit offset', parseWallTime('2026-08-14T18:30:00-04:00', 'UTC')!.toISOString(), '2026-08-14T22:30:00.000Z');
// India half-hour offset
eq('IST half-hour', parseWallTime('2026-08-14T18:30', 'Asia/Kolkata')!.toISOString(), '2026-08-14T13:00:00.000Z');

// DST crossing: weekly 6pm practice on Oct 31 2026 (EDT) + 7 days lands Nov 7 (still EDT,
// US DST ends Nov 1 2026) then +7 more = Nov 14 EST. Wall time must stay 18:00 throughout.
const p1 = parseWallTime('2026-10-31T18:00', 'America/New_York')!;
const p2 = addDaysInZone(p1, 7, 'America/New_York');
const p3 = addDaysInZone(p2, 7, 'America/New_York');
eq('DST wk1 wall', toWallTimeParts(p2, 'America/New_York').hour, 18);
eq('DST wk2 wall', toWallTimeParts(p3, 'America/New_York').hour, 18);
eq('DST wk1 utc', p2.toISOString(), '2026-11-07T23:00:00.000Z'); // EDT -4
eq('DST wk2 utc', p3.toISOString(), '2026-11-14T23:00:00.000Z'); // EST -5 => 23:00

// Southern hemisphere DST (Sydney springs forward early Oct)
const s1 = parseWallTime('2026-09-26T19:00', 'Australia/Sydney')!;
const s2 = addDaysInZone(s1, 14, 'Australia/Sydney');
eq('Sydney wall held', toWallTimeParts(s2, 'Australia/Sydney').hour, 19);

// Spring-forward gap: 2:30am on 2026-03-08 does not exist in New York
const gap = parseWallTime('2026-03-08T02:30', 'America/New_York')!;
eq('gap resolves forward', gap.toISOString(), '2026-03-08T07:30:00.000Z');

// Fall-back ambiguity: 1:30am on 2026-11-01 happens twice; take the first (EDT)
const amb = parseWallTime('2026-11-01T01:30', 'America/New_York')!;
eq('ambiguous takes first', amb.toISOString(), '2026-11-01T05:30:00.000Z');

// Month add clamps
eq('Jan31 +1mo', toDateTimeLocalValue(addMonthsInZone(parseWallTime('2026-01-31T18:00','UTC')!, 1, 'UTC'), 'UTC'), '2026-02-28T18:00');

// Round trip
const rt = parseWallTime('2026-06-15T07:05', 'America/Los_Angeles')!;
eq('round trip', toDateTimeLocalValue(rt, 'America/Los_Angeles'), '2026-06-15T07:05');

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURES`);
