import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';

const ALLOWED_STATUSES = new Set(['PENDING', 'PAID', 'OVERDUE', 'CANCELLED']);

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

        if (!status || !ALLOWED_STATUSES.has(status)) {
            return NextResponse.json({ success: false, error: 'Invalid status' }, { status: 400 });
        }

        const existing = await prisma.invoice.findUnique({
            where: { id },
            select: { id: true, teamId: true, amount: true },
        });
        if (!existing) {
            return NextResponse.json({ success: false, error: 'Invoice not found' }, { status: 404 });
        }
        if (!(await isTeamStaff(user, existing.teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can update invoices' }, { status: 403 });
        }

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
