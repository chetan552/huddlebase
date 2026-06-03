import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { appUrl } from '@/lib/tokens';

async function canPayInvoice(userId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
            player: { select: { id: true, email: true, name: true } },
            team: { select: { name: true } },
        },
    });

    if (!invoice) return null;
    if (invoice.playerId === userId) return invoice;

    const familyLink = await prisma.familyLink.findFirst({
        where: { parentId: userId, childId: invoice.playerId, status: 'ACTIVE' },
    });

    return familyLink ? invoice : null;
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = await params;
        const invoice = await canPayInvoice(user.id, id);
        if (!invoice) {
            return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        if (invoice.status === 'PAID' || invoice.status === 'CANCELLED') {
            return NextResponse.json({ success: false, error: 'Invoice is not payable' }, { status: 400 });
        }

        const stripeKey = process.env.STRIPE_SECRET_KEY;
        if (!stripeKey) {
            return NextResponse.json({ success: false, error: 'Stripe is not configured' }, { status: 503 });
        }

        const paramsBody = new URLSearchParams({
            mode: 'payment',
            success_url: appUrl(`/payments?checkout=success&invoiceId=${invoice.id}`),
            cancel_url: appUrl('/payments?checkout=cancelled'),
            'line_items[0][quantity]': '1',
            'line_items[0][price_data][currency]': 'usd',
            'line_items[0][price_data][unit_amount]': String(Math.round(invoice.amount * 100)),
            'line_items[0][price_data][product_data][name]': invoice.title,
            'line_items[0][price_data][product_data][description]': `${invoice.team.name} — ${invoice.player.name}`,
            'metadata[invoiceId]': invoice.id,
            'metadata[userId]': user.id,
        });

        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${stripeKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: paramsBody,
        });
        const data = await response.json();

        if (!response.ok || !data.url) {
            return NextResponse.json({ success: false, error: data.error?.message || 'Failed to create checkout session' }, { status: 502 });
        }

        return NextResponse.json({ success: true, url: data.url });
    } catch (error) {
        console.error('Create checkout error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create checkout session' }, { status: 500 });
    }
}
