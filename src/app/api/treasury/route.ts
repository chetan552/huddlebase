import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamStaff } from '@/lib/permissions';
import { buildTreasury, invoiceBalance } from '@/lib/payments';

/**
 * Team treasury: collected versus outstanding for the season.
 *
 * Staff only — this exposes every family's payment position.
 */
export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const teamId = searchParams.get('teamId');

        // Every team the caller has staff rights on.
        const memberships = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { teamId: true },
        });
        const staffTeamIds: string[] = [];
        for (const m of memberships) {
            if (await isTeamStaff(user, m.teamId)) staffTeamIds.push(m.teamId);
        }

        if (teamId && !staffTeamIds.includes(teamId)) {
            return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
        }
        const scope = teamId ? [teamId] : staffTeamIds;

        if (scope.length === 0) {
            return NextResponse.json({
                success: true,
                data: { summary: null, byPlayer: [], byTeam: [], recentRefunds: [] },
            });
        }

        const invoices = await prisma.invoice.findMany({
            where: { teamId: { in: scope } },
            include: {
                payments: { select: { amount: true } },
                refunds: { select: { amount: true } },
                player: { select: { id: true, name: true, avatar: true } },
                team: { select: { id: true, name: true, color: true } },
            },
        });

        const summary = buildTreasury(invoices);

        // Per-family position, so a coach can see who to chase.
        const playerMap = new Map<string, {
            id: string; name: string; avatar: string | null;
            billed: number; paid: number; outstanding: number; overdue: number; invoices: number;
        }>();
        const now = Date.now();

        for (const invoice of invoices) {
            if (invoice.status === 'CANCELLED') continue;

            const entry = playerMap.get(invoice.playerId) ?? {
                id: invoice.playerId,
                name: invoice.player.name,
                avatar: invoice.player.avatar,
                billed: 0, paid: 0, outstanding: 0, overdue: 0, invoices: 0,
            };

            const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
            const balance = invoiceBalance(invoice);

            entry.billed += invoice.amount;
            entry.paid += paid;
            entry.outstanding += balance;
            entry.invoices += 1;
            if (balance > 0 && invoice.dueDate.getTime() < now) entry.overdue += balance;

            playerMap.set(invoice.playerId, entry);
        }

        const byPlayer = Array.from(playerMap.values())
            .map((p) => ({
                ...p,
                billed: Math.round(p.billed * 100) / 100,
                paid: Math.round(p.paid * 100) / 100,
                outstanding: Math.round(p.outstanding * 100) / 100,
                overdue: Math.round(p.overdue * 100) / 100,
            }))
            // Biggest debts first — that's the working list.
            .sort((a, b) => b.overdue - a.overdue || b.outstanding - a.outstanding);

        // Per-team breakdown when the caller staffs more than one.
        const byTeam = scope.map((id) => {
            const teamInvoices = invoices.filter((i) => i.teamId === id);
            const team = teamInvoices[0]?.team;
            return {
                id,
                name: team?.name ?? 'Team',
                color: team?.color ?? '#3b82f6',
                ...buildTreasury(teamInvoices),
            };
        }).filter((t) => t.invoiceCount > 0);

        const recentRefunds = await prisma.refund.findMany({
            where: { invoice: { teamId: { in: scope } } },
            include: {
                invoice: { select: { title: true, player: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'desc' },
            take: 20,
        });

        return NextResponse.json({
            success: true,
            data: {
                summary,
                byPlayer,
                byTeam,
                recentRefunds: recentRefunds.map((r) => ({
                    id: r.id,
                    amount: r.amount,
                    reason: r.reason,
                    method: r.method,
                    invoiceTitle: r.invoice.title,
                    playerName: r.invoice.player.name,
                    createdAt: r.createdAt.toISOString(),
                })),
            },
        });
    } catch (error) {
        console.error('Treasury error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load treasury' }, { status: 500 });
    }
}
