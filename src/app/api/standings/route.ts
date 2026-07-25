import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/session';
import { isTeamMember } from '@/lib/permissions';
import {
    buildRecord,
    buildOpponentRecords,
    resolveResult,
    formatRecord,
    formatStreak,
    sortStandings,
} from '@/lib/standings';

/**
 * Season records for the caller's teams.
 *
 * Scope to one team with ?teamId=, and to one season with ?season=. Without a
 * season filter this covers every game on record.
 */
export async function GET(req: NextRequest) {
    try {
        const user = getSessionUser(req);
        if (!user) {
            return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const teamFilter = searchParams.get('teamId');
        const season = searchParams.get('season');

        const memberships = await prisma.teamMember.findMany({
            where: { userId: user.id },
            select: { teamId: true },
        });
        let teamIds = memberships.map((m) => m.teamId);

        if (teamFilter) {
            if (!(await isTeamMember(user, teamFilter))) {
                return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
            }
            teamIds = [teamFilter];
        }

        if (teamIds.length === 0) {
            return NextResponse.json({ success: true, data: { teams: [], summary: null } });
        }

        const teams = await prisma.team.findMany({
            where: { id: { in: teamIds }, ...(season && { season }) },
            select: {
                id: true,
                name: true,
                color: true,
                season: true,
                events: {
                    where: { type: 'GAME' },
                    select: {
                        id: true,
                        title: true,
                        startTime: true,
                        opponentName: true,
                        homeScore: true,
                        awayScore: true,
                        result: true,
                        isCancelled: true,
                        type: true,
                    },
                    orderBy: { startTime: 'desc' },
                },
            },
        });

        const rows = teams.map((team) => {
            const record = buildRecord(team.events);
            const now = Date.now();

            return {
                id: team.id,
                name: team.name,
                color: team.color,
                season: team.season,
                record,
                recordLabel: formatRecord(record),
                streakLabel: formatStreak(record),
                opponents: buildOpponentRecords(team.events),
                // Recent results for the game log, newest first.
                recentGames: team.events
                    .filter((e) => !e.isCancelled && new Date(e.startTime).getTime() <= now)
                    .slice(0, 20)
                    .map((e) => ({
                        id: e.id,
                        title: e.title,
                        startTime: e.startTime.toISOString(),
                        opponentName: e.opponentName,
                        homeScore: e.homeScore,
                        awayScore: e.awayScore,
                        result: resolveResult(e),
                        scored: e.homeScore !== null && e.awayScore !== null,
                    })),
                upcomingGames: team.events
                    .filter((e) => !e.isCancelled && new Date(e.startTime).getTime() > now)
                    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                    .slice(0, 5)
                    .map((e) => ({
                        id: e.id,
                        title: e.title,
                        startTime: e.startTime.toISOString(),
                        opponentName: e.opponentName,
                    })),
            };
        });

        const sorted = sortStandings(rows);

        // Combined totals across every team in scope, for the header tiles.
        const summary = sorted.reduce(
            (acc, row) => ({
                wins: acc.wins + row.record.wins,
                losses: acc.losses + row.record.losses,
                draws: acc.draws + row.record.draws,
                played: acc.played + row.record.played,
                pointsFor: acc.pointsFor + row.record.pointsFor,
                pointsAgainst: acc.pointsAgainst + row.record.pointsAgainst,
            }),
            { wins: 0, losses: 0, draws: 0, played: 0, pointsFor: 0, pointsAgainst: 0 },
        );

        return NextResponse.json({
            success: true,
            data: {
                teams: sorted,
                summary: {
                    ...summary,
                    winPct: summary.played === 0
                        ? 0
                        : Math.round(((summary.wins + summary.draws * 0.5) / summary.played) * 1000) / 1000,
                    pointDifferential: summary.pointsFor - summary.pointsAgainst,
                },
            },
        });
    } catch (error) {
        console.error('Standings error:', error);
        return NextResponse.json({ success: false, error: 'Failed to load standings' }, { status: 500 });
    }
}
