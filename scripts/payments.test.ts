/**
 * Regression tests for payment splitting and treasury totals.
 * Run with: npm run test:dates
 */
import { splitAmount, installmentDueDates, buildTreasury, invoiceBalance, toCents } from '../src/lib/payments';

let fail = 0;
const eq = (l: string, a: unknown, e: unknown) => {
  const ok = String(a) === String(e);
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${l}${ok ? '' : `\n   got=${a}\n   exp=${e}`}`);
};

// --- Splitting must never lose or invent money ---
eq('100/3 splits', splitAmount(100, 3).join(','), '33.34,33.33,33.33');
eq('100/3 sums exactly', splitAmount(100,3).reduce((a,b)=>a+toCents(b),0), 10000);
eq('150/4 splits', splitAmount(150, 4).join(','), '37.5,37.5,37.5,37.5');
eq('0.05/3 tiny', splitAmount(0.05, 3).join(','), '0.02,0.02,0.01');
eq('tiny sums exactly', splitAmount(0.05,3).reduce((a,b)=>a+toCents(b),0), 5);
eq('single instalment', splitAmount(99.99, 1).join(','), '99.99');
eq('zero count safe', splitAmount(100, 0).length, 0);
// Fuzz: every split must sum back to the original
let sumOk = true;
for (let cents = 1; cents <= 2000; cents += 7) {
  for (let n = 1; n <= 12; n++) {
    const parts = splitAmount(cents/100, n);
    if (parts.reduce((a,b)=>a+toCents(b),0) !== cents) { sumOk = false; break; }
  }
}
eq('fuzz: splits always sum exactly', sumOk, true);

// --- Monthly due dates clamp and do not drift ---
const d = (s: string) => new Date(s + 'T00:00:00Z');
const iso = (ds: Date[]) => ds.map(x => x.toISOString().slice(0,10)).join(',');
eq('monthly from 31st clamps, no drift', iso(installmentDueDates(d('2026-01-31'), 4, 'MONTHLY')),
   '2026-01-31,2026-02-28,2026-03-31,2026-04-30');
eq('monthly across year', iso(installmentDueDates(d('2026-11-15'), 3, 'MONTHLY')),
   '2026-11-15,2026-12-15,2027-01-15');
eq('weekly', iso(installmentDueDates(d('2026-03-01'), 3, 'WEEKLY')), '2026-03-01,2026-03-08,2026-03-15');
eq('biweekly', iso(installmentDueDates(d('2026-03-01'), 3, 'BIWEEKLY')), '2026-03-01,2026-03-15,2026-03-29');

// --- Treasury ---
const past = new Date(Date.now() - 86400000);
const future = new Date(Date.now() + 86400000);
const inv = (amount: number, status: string, dueDate: Date, paid: number[] = [], refunds: number[] = []) =>
  ({ amount, status, dueDate, payments: paid.map(a=>({amount:a})), refunds: refunds.map(a=>({amount:a})) });

const t = buildTreasury([
  inv(100, 'PAID', past, [100]),
  inv(100, 'PENDING', future, [40]),        // partial, not yet due
  inv(50,  'PENDING', past, []),            // fully overdue
  inv(75,  'CANCELLED', past, []),          // excluded entirely
  inv(200, 'PAID', past, [200], [50]),      // refunded in part
]);
eq('billed excludes cancelled', t.billed, 450);
eq('collected', t.collected, 340);
eq('refunded', t.refunded, 50);
eq('net = collected - refunded', t.net, 290);
eq('outstanding counts partials', t.outstanding, 110);   // 60 + 50
eq('overdue only past-due unpaid', t.overdue, 50);
eq('overdue count', t.overdueCount, 1);
eq('paid count', t.paidCount, 2);
eq('invoice count excludes cancelled', t.invoiceCount, 4);
eq('collection rate %', t.collectionRate, 75.6);

// Overpayment must not produce negative outstanding
const over = buildTreasury([inv(100, 'PAID', past, [120])]);
eq('overpayment floors at zero', over.outstanding, 0);

eq('empty treasury safe', buildTreasury([]).billed, 0);
eq('empty collection rate', buildTreasury([]).collectionRate, 0);
eq('balance after refund reopens', invoiceBalance(inv(100,'PAID',past,[100],[30])), 30);

console.log(fail === 0 ? '\nALL PASS' : `\n${fail} FAILURES`);
process.exit(fail === 0 ? 0 : 1);
