import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }
        const { id } = await params;

        const { status } = await req.json();

        const invoice = await prisma.invoice.update({
            where: { id },
            data: { status },
        });

        // If marking as paid, create a payment record
        if (status === 'PAID') {
            await prisma.payment.create({
                data: {
                    invoiceId: id,
                    userId: user.id,
                    amount: invoice.amount,
                    method: 'MANUAL',
                },
            });
        }

        return NextResponse.json({ success: true, data: invoice });
    } catch (error) {
        console.error('Update invoice error:', error);
        return NextResponse.json({ success: false, error: 'Failed to update invoice' }, { status: 500 });
    }
}
