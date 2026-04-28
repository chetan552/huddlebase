import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';

export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const userTeams = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { teamId: true },
        });
        const teamIds = userTeams.map((t) => t.teamId);

        const [attendanceRecords, invoices, feedbackRecords] = await Promise.all([
            // Attendance across all team events
            prisma.attendance.findMany({
                where: { event: { teamId: { in: teamIds } } },
                include: {
                    user: { select: { name: true } },
                    event: { select: { startTime: true } },
                },
            }),
            // All invoices for these teams
            prisma.invoice.findMany({
                where: { teamId: { in: teamIds } },
                select: { amount: true, status: true, dueDate: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),
            // Player feedback (effort ratings)
            prisma.playerFeedback.findMany({
                where: { player: { teamMembers: { some: { teamId: { in: teamIds } } } } },
                include: { player: { select: { name: true } } },
                orderBy: { createdAt: 'asc' },
            }),
        ]);

        // --- Attendance by player ---
        const playerMap: Record<string, { name: string; present: number; total: number }> = {};
        for (const r of attendanceRecords) {
            const key = r.userId;
            if (!playerMap[key]) playerMap[key] = { name: r.user.name, present: 0, total: 0 };
            playerMap[key].total++;
            if (r.present) playerMap[key].present++;
        }
        const attendanceByPlayer = Object.values(playerMap)
            .map((p) => ({ ...p, pct: p.total === 0 ? 0 : Math.round((p.present / p.total) * 100) }))
            .sort((a, b) => b.pct - a.pct);

        // --- Revenue by month (paid invoices only) ---
        const revenueMap: Record<string, number> = {};
        for (const inv of invoices) {
            if (inv.status !== 'PAID') continue;
            const key = inv.createdAt.toISOString().slice(0, 7); // "YYYY-MM"
            revenueMap[key] = (revenueMap[key] || 0) + inv.amount;
        }
        const revenueByMonth = Object.entries(revenueMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([month, amount]) => ({
                month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                amount: Math.round(amount * 100) / 100,
            }));

        // --- Effort trend by player ---
        const effortMap: Record<string, { name: string; ratings: Array<{ date: string; rating: number }> }> = {};
        for (const f of feedbackRecords) {
            const key = f.playerId;
            if (!effortMap[key]) effortMap[key] = { name: f.player.name, ratings: [] };
            effortMap[key].ratings.push({
                date: f.createdAt.toISOString().split('T')[0],
                rating: f.effortRating,
            });
        }
        const effortTrend = Object.values(effortMap);

        // --- Upcoming invoice summary (next 30 days) ---
        const now = new Date();
        const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const upcomingInvoices = invoices
            .filter((i) => i.status === 'PENDING' && i.dueDate >= now && i.dueDate <= in30)
            .reduce((sum, i) => sum + i.amount, 0);

        const overdueAmount = invoices
            .filter((i) => i.status === 'OVERDUE' || (i.status === 'PENDING' && i.dueDate < now))
            .reduce((sum, i) => sum + i.amount, 0);

        const totalCollected = invoices
            .filter((i) => i.status === 'PAID')
            .reduce((sum, i) => sum + i.amount, 0);

        return NextResponse.json({
            success: true,
            data: {
                attendanceByPlayer,
                revenueByMonth,
                effortTrend,
                summary: {
                    upcomingInvoices: Math.round(upcomingInvoices * 100) / 100,
                    overdueAmount: Math.round(overdueAmount * 100) / 100,
                    totalCollected: Math.round(totalCollected * 100) / 100,
                    totalPlayers: attendanceByPlayer.length,
                },
            },
        });
    } catch (error) {
        console.error('Analytics error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load analytics' }, { status: 500 });
    }
}
