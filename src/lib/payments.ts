/**
 * Payment plans and treasury maths.
 *
 * A plan is split into instalments, each of which becomes an ordinary Invoice — so
 * reminders, Stripe checkout and manual payment recording all work unchanged.
 */

export const PLAN_FREQUENCIES = ['WEEKLY', 'BIWEEKLY', 'MONTHLY'] as const;
export type PlanFrequency = (typeof PLAN_FREQUENCIES)[number];

export const MAX_INSTALLMENTS = 24;

export function isPlanFrequency(value: unknown): value is PlanFrequency {
    return PLAN_FREQUENCIES.includes(value as PlanFrequency);
}

/** Round to whole cents, avoiding the float drift that makes totals end in .00000001. */
export function toCents(amount: number): number {
    return Math.round(amount * 100);
}

export function fromCents(cents: number): number {
    return Math.round(cents) / 100;
}

/**
 * Split a total into instalments that sum back exactly to the original.
 *
 * Division is done in integer cents and any remainder is spread one cent at a time
 * across the earliest instalments — so £100 over 3 payments becomes 33.34, 33.33,
 * 33.33 rather than three lots of 33.33 that lose a penny.
 */
export function splitAmount(total: number, count: number): number[] {
    if (count <= 0) return [];

    const totalCents = toCents(total);
    const base = Math.floor(totalCents / count);
    const remainder = totalCents - base * count;

    return Array.from({ length: count }, (_, i) => fromCents(base + (i < remainder ? 1 : 0)));
}

/** Due dates for each instalment, stepping by the plan's frequency. */
export function installmentDueDates(firstDue: Date, count: number, frequency: PlanFrequency): Date[] {
    const dates: Date[] = [];
    const firstDayOfMonth = firstDue.getUTCDate();

    for (let i = 0; i < count; i += 1) {
        const date = new Date(firstDue);

        if (frequency === 'MONTHLY') {
            // Step from the original date each time, clamping short months, so a plan
            // starting on the 31st doesn't drift earlier every month.
            const targetMonth = firstDue.getUTCMonth() + i;
            const targetYear = firstDue.getUTCFullYear() + Math.floor(targetMonth / 12);
            const normalisedMonth = ((targetMonth % 12) + 12) % 12;
            const daysInMonth = new Date(Date.UTC(targetYear, normalisedMonth + 1, 0)).getUTCDate();
            date.setUTCFullYear(targetYear, normalisedMonth, Math.min(firstDayOfMonth, daysInMonth));
        } else {
            const step = frequency === 'BIWEEKLY' ? 14 : 7;
            date.setUTCDate(firstDue.getUTCDate() + i * step);
        }

        dates.push(date);
    }

    return dates;
}

export interface InvoiceLike {
    amount: number;
    status: string;
    dueDate: Date;
    payments: { amount: number }[];
    refunds: { amount: number }[];
}

export interface TreasurySummary {
    /** Total value invoiced, excluding cancelled invoices. */
    billed: number;
    /** Everything actually received, before refunds. */
    collected: number;
    refunded: number;
    /** collected − refunded: what the team actually holds. */
    net: number;
    outstanding: number;
    overdue: number;
    invoiceCount: number;
    paidCount: number;
    overdueCount: number;
    collectionRate: number;
}

/**
 * Roll invoices into a treasury view.
 *
 * Works from the Payment and Refund ledgers rather than invoice status alone, so
 * partial payments are counted correctly instead of an unpaid balance reading as
 * either fully paid or fully outstanding.
 */
export function buildTreasury(invoices: InvoiceLike[]): TreasurySummary {
    const now = Date.now();

    let billedCents = 0;
    let collectedCents = 0;
    let refundedCents = 0;
    let outstandingCents = 0;
    let overdueCents = 0;
    let paidCount = 0;
    let overdueCount = 0;
    let counted = 0;

    for (const invoice of invoices) {
        if (invoice.status === 'CANCELLED') continue;
        counted += 1;

        const amountCents = toCents(invoice.amount);
        const paidCents = invoice.payments.reduce((sum, p) => sum + toCents(p.amount), 0);
        const refundCents = invoice.refunds.reduce((sum, r) => sum + toCents(r.amount), 0);

        billedCents += amountCents;
        collectedCents += paidCents;
        refundedCents += refundCents;

        // Never let an overpayment show as negative outstanding.
        const remaining = Math.max(0, amountCents - paidCents);
        outstandingCents += remaining;

        if (remaining === 0 && paidCents > 0) {
            paidCount += 1;
        } else if (remaining > 0 && invoice.dueDate.getTime() < now) {
            overdueCents += remaining;
            overdueCount += 1;
        }
    }

    return {
        billed: fromCents(billedCents),
        collected: fromCents(collectedCents),
        refunded: fromCents(refundedCents),
        net: fromCents(collectedCents - refundedCents),
        outstanding: fromCents(outstandingCents),
        overdue: fromCents(overdueCents),
        invoiceCount: counted,
        paidCount,
        overdueCount,
        collectionRate: billedCents === 0 ? 0 : Math.round((collectedCents / billedCents) * 1000) / 10,
    };
}

/** Remaining balance on a single invoice, after payments and refunds. */
export function invoiceBalance(invoice: InvoiceLike): number {
    const paid = invoice.payments.reduce((sum, p) => sum + toCents(p.amount), 0);
    const refunded = invoice.refunds.reduce((sum, r) => sum + toCents(r.amount), 0);
    return fromCents(Math.max(0, toCents(invoice.amount) - paid + refunded));
}
