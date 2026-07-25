/**
 * Regression tests for timezone and recurrence maths.
 * Run with: npm run test:dates
 */
import { expandRecurrence, parseRecurrenceRule } from '../src/lib/recurrence';
import { parseWallTime, toWallTimeParts, toDateTimeLocalValue } from '../src/lib/timezone';
let fail=0;
const eq=(l:string,a:unknown,e:unknown)=>{const ok=String(a)===String(e); if(!ok)fail++; console.log(`${ok?'PASS':'FAIL'} ${l}\n   got=${a}\n   exp=${e}`);};
const TZ='America/New_York';
const fmt=(ds:Date[])=>ds.map(d=>toDateTimeLocalValue(d,TZ)).join(' | ');

// Weekly x4 from Tue Aug 11 2026 6pm
const s=parseWallTime('2026-08-11T18:00',TZ)!;
eq('weekly count=4', fmt(expandRecurrence(s,{frequency:'WEEKLY',interval:1,count:4},TZ)),
  '2026-08-11T18:00 | 2026-08-18T18:00 | 2026-08-25T18:00 | 2026-09-01T18:00');

// Weekly Tue+Thu, 5 occurrences, starting Tue
eq('weekly Tue+Thu', fmt(expandRecurrence(s,{frequency:'WEEKLY',interval:1,weekdays:[2,4],count:5},TZ)),
  '2026-08-11T18:00 | 2026-08-13T18:00 | 2026-08-18T18:00 | 2026-08-20T18:00 | 2026-08-25T18:00');

// Earlier weekday in first week must not emit before start (start Tue, ask Mon+Tue)
eq('no pre-start emit', fmt(expandRecurrence(s,{frequency:'WEEKLY',interval:1,weekdays:[1,2],count:3},TZ)),
  '2026-08-11T18:00 | 2026-08-17T18:00 | 2026-08-18T18:00');

// Across DST end (Nov 1 2026): wall time must hold at 18:00
const d=parseWallTime('2026-10-27T18:00',TZ)!;
const across=expandRecurrence(d,{frequency:'WEEKLY',interval:1,count:4},TZ);
eq('DST wall held', across.map(x=>toWallTimeParts(x,TZ).hour).join(','), '18,18,18,18');
eq('DST utc shift', across.map(x=>x.toISOString().slice(11,16)).join(','), '22:00,23:00,23:00,23:00');

// Biweekly
eq('biweekly', fmt(expandRecurrence(s,{frequency:'BIWEEKLY',interval:1,count:3},TZ)),
  '2026-08-11T18:00 | 2026-08-25T18:00 | 2026-09-08T18:00');

// until as bare date is inclusive of that whole day
eq('until inclusive', fmt(expandRecurrence(s,{frequency:'WEEKLY',interval:1,until:'2026-08-25'},TZ)),
  '2026-08-11T18:00 | 2026-08-18T18:00 | 2026-08-25T18:00');

// Monthly clamps
const j=parseWallTime('2026-01-31T18:00',TZ)!;
eq('monthly clamp', fmt(expandRecurrence(j,{frequency:'MONTHLY',interval:1,count:3},TZ)),
  '2026-01-31T18:00 | 2026-02-28T18:00 | 2026-03-31T18:00');

// Bounds
eq('open-ended rejected', parseRecurrenceRule({frequency:'WEEKLY'}).error, 'Recurring events need either an end date or an occurrence count');
eq('bad freq rejected', parseRecurrenceRule({frequency:'HOURLY',count:3}).error?.slice(0,17), 'Frequency must be');
eq('count cap', parseRecurrenceRule({frequency:'WEEKLY',count:9999}).error?.slice(0,5), 'Count');
eq('absent ok', String(parseRecurrenceRule(undefined).rule)+String(parseRecurrenceRule(undefined).error), 'nullnull');
eq('horizon cap', expandRecurrence(s,{frequency:'DAILY',interval:1,until:'2099-01-01'},TZ).length <= 260, 'true');
console.log(fail===0?'\nALL PASS':`\n${fail} FAILURES`);
