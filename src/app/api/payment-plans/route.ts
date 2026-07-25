import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';
import { splitAmount, installmentDueDates, isPlanFrequency, MAX_INSTALLMENTS } from '@/lib/payments';
import { notifyUsers } from '@/lib/notify';

/** Payment plans for a team, with progress against each. */
export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get('teamId');

        if (!teamId) {
            return NextResponse.json({ success: false, error: 'teamId is required' }, { status: 400 });
        }
        if (!(await isTeamStaff(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }

        const plans = await prisma.paymentPlan.findMany({
            where: { teamId },
            include: {
                invoices: {
                    select: { id: true, status: true, amount: true, dueDate: true, playerId: true, installmentNumber: true },
                    orderBy: { installmentNumber: 'asc' },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        return NextResponse.json({
            success: true,
            data: plans.map((p) => {
                const paid = p.invoices.filter((i) => i.status === 'PAID');
                const players = new Set(p.invoices.map((i) => i.playerId));
                return {
                    id: p.id,
                    title: p.title,
                    description: p.description,
                    totalAmount: p.totalAmount,
                    installments: p.installments,
                    frequency: p.frequency,
                    firstDueDate: p.firstDueDate.toISOString(),
                    playerCount: players.size,
                    invoiceCount: p.invoices.length,
                    paidCount: paid.length,
                    collected: paid.reduce((sum, i) => sum + i.amount, 0),
                    expected: p.invoices.reduce((sum, i) => sum + i.amount, 0),
                    createdAt: p.createdAt.toISOString(),
                };
            }),
        });
    } catch (error) {
        console.error('Fetch payment plans error:', error);
        return NextResponse.json({ success: false, error: 'Failed to fetch plans' }, { status: 500 });
    }
}

/**
 * Create a plan and generate its instalment invoices.
 *
 * Each instalment is a normal Invoice, so existing reminders, checkout and manual
 * payment recording apply without special-casing plans.
 */
export async function POST(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { teamId, title, description, totalAmount, installments, frequency, firstDueDate, playerIds, notify } =
            await req.json();

        if (!teamId || !title?.trim()) {
            return NextResponse.json({ success: false, error: 'teamId and title are required' }, { status: 400 });
        }
        if (!(await isTeamStaff(user, teamId))) {
            return NextResponse.json({ success: false, error: 'Only team staff can create payment plans' }, { status: 403 });
        }

        const total = Number(totalAmount);
        if (!Number.isFinite(total) || total <= 0) {
            return NextResponse.json({ success: false, error: 'Total must be greater than zero' }, { status: 400 });
        }

        const count = Number(installments);
        if (!Number.isInteger(count) || count < 1 || count > MAX_INSTALLMENTS) {
            return NextResponse.json(
                { success: false, error: `Instalments must be between 1 and ${MAX_INSTALLMENTS}` },
                { status: 400 },
            );
        }

        if (!isPlanFrequency(frequency)) {
            return NextResponse.json({ success: false, error: 'Frequency must be WEEKLY, BIWEEKLY or MONTHLY' }, { status: 400 });
        }

        const firstDue = new Date(firstDueDate);
        if (Number.isNaN(firstDue.getTime())) {
            return NextResponse.json({ success: false, error: 'Invalid first due date' }, { status: 400 });
        }

        // Default to billing every player on the roster.
        let targetPlayerIds: string[];
        if (Array.isArray(playerIds) && playerIds.length > 0) {
            const members = await prisma.teamMember.findMany({
                where: { teamId, userId: { in: playerIds } },
                select: { userId: true },
            });
            targetPlayerIds = members.map((m) => m.userId);
            if (targetPlayerIds.length !== playerIds.length) {
                return NextResponse.json({ success: false, error: 'Some selected people are not on this team' }, { status: 400 });
            }
        } else {
            const members = await prisma.teamMember.findMany({
                where: { teamId, role: 'PLAYER' },
                select: { userId: true },
            });
            targetPlayerIds = members.map((m) => m.userId);
        }

        if (targetPlayerIds.length === 0) {
            return NextResponse.json({ success: false, error: 'No players to bill' }, { status: 400 });
        }

        const amounts = splitAmount(total, count);
        const dueDates = installmentDueDates(firstDue, count, frequency);

        const plan = await prisma.$transaction(async (tx) => {
            const created = await tx.paymentPlan.create({
                data: {
                    teamId,
                    title: title.trim().slice(0, 200),
                    description: description?.trim()?.slice(0, 500) || null,
                    totalAmount: total,
                    installments: count,
                    frequency,
                    firstDueDate: firstDue,
                },
            });

            await tx.invoice.createMany({
                data: targetPlayerIds.flatMap((playerId) =>
                    amounts.map((amount, index) => ({
                        teamId,
                        playerId,
                        planId: created.id,
                        installmentNumber: index + 1,
                        title: `${created.title} (${index + 1} of ${count})`,
                        description: description?.trim()?.slice(0, 500) || null,
                        amount,
                        dueDate: dueDates[index],
                    })),
                ),
            });

            return created;
        });

        if (notify) {
            const team = await prisma.team.findUnique({ where: { id: teamId }, select: { name: true } });
            await notifyUsers({
                userIds: targetPlayerIds,
                type: 'INVOICE_DUE',
                title: `Payment plan: ${plan.title}`,
                body: `${count} payments of about $${amounts[0].toFixed(2)} for ${team?.name ?? 'your team'}`,
                link: '/payments',
            });
        }

        return NextResponse.json({
            success: true,
            data: {
                id: plan.id,
                title: plan.title,
                installments: count,
                amounts,
                dueDates: dueDates.map((d) => d.toISOString()),
                invoicesCreated: targetPlayerIds.length * count,
                playerCount: targetPlayerIds.length,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Create payment plan error:', error);
        return NextResponse.json({ success: false, error: 'Failed to create payment plan' }, { status: 500 });
    }
}
