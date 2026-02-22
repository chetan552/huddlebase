import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        if (user.role !== 'ADMIN' && user.role !== 'COACH') {
            return NextResponse.json({ success: false, error: 'Only coaches and admins can create invoices' }, { status: 403 });
        }

        const { title, description, amount, dueDate, teamId, playerIds } = await req.json();

        if (!title || !amount || !dueDate || !teamId || !Array.isArray(playerIds) || playerIds.length === 0) {
            return NextResponse.json({ success: false, error: 'Title, amount, dueDate, teamId, and at least one playerId are required' }, { status: 400 });
        }

        const parsedAmount = parseFloat(amount);
        const parsedDueDate = new Date(dueDate);

        const invoices = await prisma.$transaction(
            playerIds.map((playerId: string) =>
                prisma.invoice.create({
                    data: {
                        title,
                        description: description || null,
                        amount: parsedAmount,
                        dueDate: parsedDueDate,
                        teamId,
                        playerId,
                    },
                })
            )
        );

        return NextResponse.json({ success: true, count: invoices.length }, { status: 201 });
    } catch (error) {
        console.error('Bulk create invoices error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create invoices' }, { status: 500 });
    }
}
