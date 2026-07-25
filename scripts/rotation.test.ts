/**
 * Regression tests for duty rotation fairness and standings aggregation.
 * Run with: npm run test:dates
 */
import { planRotation } from '../src/lib/assignments';
import { buildRecord, resolveResult, formatRecord, formatStreak, sortStandings } from '../src/lib/standings';

let fail = 0;
const eq = (l: string, a: unknown, e: unknown) => {
  const ok = String(a) === String(e);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${l}${ok ? '' : `\n   got=${a}\n   exp=${e}`}`);
};

const people = (names: string[], counts: number[] = []) =>
  names.map((n, i) => ({ userId: `u${i}`, name: n, existingCount: counts[i] ?? 0 }));

// --- Rotation: even spread over a season ---
const evts = Array.from({ length: 12 }, (_, i) => `e${i}`);
const plan = planRotation({ eventIds: evts, candidates: people(['Ann','Bob','Cat','Dan']), role: 'SCOREKEEPER' });
const tally = (p: typeof plan) => {
  const m: Record<string, number> = {};
  for (const x of p) m[x.userId] = (m[x.userId] ?? 0) + 1;
  return Object.values(m).sort((a,b)=>a-b);
};
eq('12 events / 4 people = 3 each', tally(plan).join(','), '3,3,3,3');
eq('one assignment per event', plan.length, 12);

// Uneven: 10 events / 4 people => max-min <= 1
const plan2 = planRotation({ eventIds: evts.slice(0,10), candidates: people(['Ann','Bob','Cat','Dan']), role: 'REFEREE' });
const t2 = tally(plan2);
eq('10/4 spread is balanced', t2[t2.length-1] - t2[0] <= 1, true);

// Seeded load: someone with prior duties gets fewer new ones
const plan3 = planRotation({ eventIds: evts.slice(0,6), candidates: people(['Ann','Bob','Cat'], [3,0,0]), role: 'CONCESSIONS' });
const annCount = plan3.filter(p => p.userId === 'u0').length;
const bobCount = plan3.filter(p => p.userId === 'u1').length;
eq('prior load reduces new assignments', annCount < bobCount, true);

// Determinism: same inputs, same output
const a = planRotation({ eventIds: evts, candidates: people(['Ann','Bob','Cat','Dan']), role: 'SCOREKEEPER' });
const b = planRotation({ eventIds: evts, candidates: people(['Ann','Bob','Cat','Dan']), role: 'SCOREKEEPER' });
eq('rotation is deterministic', JSON.stringify(a), JSON.stringify(b));

// Multi-slot: nobody assigned twice at the same event
const plan4 = planRotation({ eventIds: ['e0','e1'], candidates: people(['Ann','Bob','Cat']), role: 'FIELD_SETUP', slotsPerEvent: 2 });
const e0 = plan4.filter(p => p.eventId === 'e0').map(p => p.userId);
eq('no duplicate person per event', new Set(e0).size, e0.length);
eq('multi-slot count', plan4.length, 4);

// Fewer candidates than slots leaves slots open rather than duplicating
const plan5 = planRotation({ eventIds: ['e0'], candidates: people(['Ann']), role: 'OTHER', slotsPerEvent: 3 });
eq('slots exceed candidates', plan5.length, 1);
eq('empty candidates', planRotation({ eventIds: ['e0'], candidates: [], role: 'OTHER' }).length, 0);

// --- Standings ---
const g = (id: string, day: number, hs: number|null, as: number|null, result: string|null = null, cancelled = false) => ({
  id, startTime: new Date(2026, 7, day), opponentName: 'Rivals',
  homeScore: hs, awayScore: as, result, isCancelled: cancelled, type: 'GAME',
});
const rec = buildRecord([g('1',1,3,1), g('2',2,0,2), g('3',3,1,1), g('4',4,5,0)]);
eq('W-L-D counts', `${rec.wins}-${rec.losses}-${rec.draws}`, '2-1-1');
eq('record label', formatRecord(rec), '2-1-1');
eq('points for/against', `${rec.pointsFor}/${rec.pointsAgainst}`, '9/4');
eq('differential', rec.pointDifferential, 5);
eq('winPct counts draw as half', rec.winPct, 0.625);
eq('form newest first', rec.form.join(','), 'WIN,DRAW,LOSS,WIN');
eq('streak', formatStreak(rec), 'W1');

// Explicit result overrides score (forfeit)
eq('explicit result wins', resolveResult(g('5',5,0,0,'WIN')), 'WIN');
// Cancelled and unscored games are excluded
eq('cancelled excluded', buildRecord([g('6',6,3,0,null,true)]).played, 0);
eq('unscored excluded', buildRecord([g('7',7,null,null)]).played, 0);
eq('empty record safe', buildRecord([]).played, 0);
eq('empty streak', formatStreak(buildRecord([])), '—');

// Streak of 3 losses
const losing = buildRecord([g('a',1,3,0), g('b',2,0,1), g('c',3,0,2), g('d',4,1,4)]);
eq('losing streak', formatStreak(losing), 'L3');

// Standings sort: winPct desc
const sorted = sortStandings([
  { name: 'B', record: buildRecord([g('x',1,1,0)]) },
  { name: 'A', record: buildRecord([g('y',1,0,1)]) },
]);
eq('standings sorted by winPct', sorted[0].name, 'B');

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
