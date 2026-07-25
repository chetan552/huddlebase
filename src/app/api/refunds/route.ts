import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';
import { toCents, fromCents } from '@/lib/payments';
import { notifyUsers } from '@/lib/notify';

/**
 * Issue a refund against an invoice.
 *
 * Recorded as its own row rather than by deleting a payment, so the ledger stays
 * additive and the treasury view can report gross collected, refunded and net
 * separately. A Stripe refund is attempted when the original payment came through
 * Stripe and a key is configured; otherwise it's recorded as a manual refund for a
 * cheque or cash return handled offline.
 */
export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { invoiceId, paymentId, amount, reason, viaStripe } = await req.json();

        if (!invoiceId) {
            return NextResponse.json({ success: false, error: 'invoiceId is required' }, { status: 400 });
        }

        const invoice = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                payments: true,
                refunds: true,
                player: { select: { id: true, name: true } },
                team: { select: { name: true } },
            },
        });

        if (!invoice) {
            return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, invoice.teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can issue refunds' }, { status: 403 });
        }

        const paidCents = invoice.payments.reduce((sum, p) => sum + toCents(p.amount), 0);
        const refundedCents = invoice.refunds.reduce((sum, r) => sum + toCents(r.amount), 0);
        const refundableCents = paidCents - refundedCents;

        if (refundableCents <= 0) {
            return NextResponse.json({ success: false, error: 'There is nothing left to refund' }, { status: 400 });
        }

        // Default to refunding everything still refundable.
        const requestedCents = amount === undefined || amount === null || amount === ''
            ? refundableCents
            : toCents(Number(amount));

        if (!Number.isFinite(requestedCents) || requestedCents <= 0) {
            return NextResponse.json({ success: false, error: 'Refund amount must be greater than zero' }, { status: 400 });
        }
        if (requestedCents > refundableCents) {
            return NextResponse.json(
                { success: false, error: `Cannot refund more than $${fromCents(refundableCents).toFixed(2)}` },
                { status: 400 },
            );
        }

        // Tie the refund to a specific payment when one was named.
        let sourcePayment = null;
        if (paymentId) {
            sourcePayment = invoice.payments.find((p) => p.id === paymentId) ?? null;
            if (!sourcePayment) {
                return NextResponse.json({ success: false, error: 'Payment not found on this invoice' }, { status: 404 });
            }
        }

        let method = 'MANUAL';
        let externalId: string | null = null;

        const stripeKey = process.env.STRIPE_SECRET_KEY;
        const stripePayment = sourcePayment?.method === 'STRIPE'
            ? sourcePayment
            : invoice.payments.find((p) => p.method === 'STRIPE' && p.externalId);

        if (viaStripe && stripeKey && stripePayment?.externalId) {
            const body = new URLSearchParams({
                payment_intent: stripePayment.externalId,
                amount: String(requestedCents),
                ...(reason && { 'metadata[reason]': String(reason).slice(0, 200) }),
                'metadata[invoiceId]': invoice.id,
            });

            const response = await fetch('https://api.stripe.com/v1/refunds', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${stripeKey}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
            });
            const data = await response.json();

            if (!response.ok) {
                return NextResponse.json(
                    { success: false, error: data.error?.message || 'Stripe refund failed' },
                    { status: 502 },
                );
            }

            method = 'STRIPE';
            externalId = data.id ?? null;
        } else if (viaStripe) {
            // Be explicit rather than silently recording a manual refund the coach
            // then assumes was actually returned to the card.
            return NextResponse.json(
                {
                    success: false,
                    error: stripeKey
                        ? 'That payment was not made by card, so it cannot be refunded through Stripe'
                        : 'Stripe is not configured',
                },
                { status: 400 },
            );
        }

        const refundAmount = fromCents(requestedCents);
        const fullyRefunded = requestedCents === refundableCents;

        const refund = await prisma.$transaction(async (tx) => {
            const created = await tx.refund.create({
                data: {
                    invoiceId: invoice.id,
                    paymentId: sourcePayment?.id ?? stripePayment?.id ?? null,
                    amount: refundAmount,
                    reason: reason?.trim()?.slice(0, 300) || null,
                    method,
                    externalId,
                    issuedById: user.id,
                },
            });

            // A fully refunded invoice is no longer paid; a partial refund reopens the
            // balance so it shows as outstanding again.
            await tx.invoice.update({
                where: { id: invoice.id },
                data: { status: fullyRefunded ? 'REFUNDED' : 'PENDING' },
            });

            return created;
        });

        await notifyUsers({
            userIds: [invoice.playerId],
            type: 'REFUND',
            title: `Refund issued: $${refundAmount.toFixed(2)}`,
            body: `${invoice.title} — ${invoice.team.name}`,
            link: '/payments',
        });

        return NextResponse.json({
            success: true,
            data: {
                id: refund.id,
                amount: refundAmount,
                method,
                invoiceStatus: fullyRefunded ? 'REFUNDED' : 'PENDING',
                remainingRefundable: fromCents(refundableCents - requestedCents),
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Create refund error:', error);
        return NextResponse.json({ success: false, error: 'Failed to issue refund' }, { status: 500 });
    }
}
