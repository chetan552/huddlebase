/**
 * Season records and standings.
 *
 * Games already store `homeScore`, `awayScore` and `result`; nothing aggregated them.
 * `result` is treated as the source of truth when set (a coach may record a forfeit
 * that the score doesn't reflect) and derived from the score otherwise.
 */

export type GameResult = 'WIN' | 'LOSS' | 'DRAW';

export interface GameLike {
    id: string;
    startTime: Date;
    opponentName: string | null;
    homeScore: number | null;
    awayScore: number | null;
    result: string | null;
    isCancelled: boolean;
    type: string;
}

export interface TeamRecord {
    wins: number;
    losses: number;
    draws: number;
    played: number;
    /** Wins ÷ played, with draws counting as half a win — the usual convention. */
    winPct: number;
    pointsFor: number;
    pointsAgainst: number;
    pointDifferential: number;
    /** Most recent results first, newest-to-oldest, capped at 5. */
    form: GameResult[];
    currentStreak: { type: GameResult; count: number } | null;
}

/**
 * Resolve a game's outcome. An explicit `result` wins; otherwise it's inferred from
 * the score. Returns null for games that haven't been played or scored.
 */
export function resolveResult(game: GameLike): GameResult | null {
    if (game.isCancelled) return null;

    if (game.result === 'WIN' || game.result === 'LOSS' || game.result === 'DRAW') {
        return game.result;
    }

    if (game.homeScore === null || game.awayScore === null) return null;
    if (game.homeScore > game.awayScore) return 'WIN';
    if (game.homeScore < game.awayScore) return 'LOSS';
    return 'DRAW';
}

const EMPTY_RECORD: TeamRecord = {
    wins: 0, losses: 0, draws: 0, played: 0, winPct: 0,
    pointsFor: 0, pointsAgainst: 0, pointDifferential: 0,
    form: [], currentStreak: null,
};

/** Aggregate a set of games into a season record. */
export function buildRecord(games: GameLike[]): TeamRecord {
    const played = games
        .filter((g) => g.type === 'GAME' && !g.isCancelled)
        .map((g) => ({ game: g, result: resolveResult(g) }))
        .filter((entry): entry is { game: GameLike; result: GameResult } => entry.result !== null)
        // Oldest first so streak and form calculations read chronologically.
        .sort((a, b) => a.game.startTime.getTime() - b.game.startTime.getTime());

    if (played.length === 0) return { ...EMPTY_RECORD };

    let wins = 0, losses = 0, draws = 0, pointsFor = 0, pointsAgainst = 0;

    for (const { game, result } of played) {
        if (result === 'WIN') wins += 1;
        else if (result === 'LOSS') losses += 1;
        else draws += 1;

        // Scores are optional even on a played game (a forfeit recorded via `result`).
        if (game.homeScore !== null) pointsFor += game.homeScore;
        if (game.awayScore !== null) pointsAgainst += game.awayScore;
    }

    const total = played.length;

    // Streak: walk backwards from the most recent game while the result matches.
    const mostRecent = played[total - 1].result;
    let streakCount = 0;
    for (let i = total - 1; i >= 0; i -= 1) {
        if (played[i].result !== mostRecent) break;
        streakCount += 1;
    }

    return {
        wins,
        losses,
        draws,
        played: total,
        winPct: Math.round(((wins + draws * 0.5) / total) * 1000) / 1000,
        pointsFor,
        pointsAgainst,
        pointDifferential: pointsFor - pointsAgainst,
        form: played.slice(-5).map((p) => p.result).reverse(),
        currentStreak: { type: mostRecent, count: streakCount },
    };
}

export interface OpponentRecord extends TeamRecord {
    opponent: string;
}

/** Head-to-head records, so a coach can see who they struggle against. */
export function buildOpponentRecords(games: GameLike[]): OpponentRecord[] {
    const byOpponent = new Map<string, GameLike[]>();

    for (const game of games) {
        const name = game.opponentName?.trim();
        if (!name) continue;
        if (!byOpponent.has(name)) byOpponent.set(name, []);
        byOpponent.get(name)!.push(game);
    }

    return Array.from(byOpponent.entries())
        .map(([opponent, list]) => ({ opponent, ...buildRecord(list) }))
        .filter((r) => r.played > 0)
        .sort((a, b) => b.played - a.played || b.winPct - a.winPct);
}

/** "12-3-2" or "12-3" when there are no draws. */
export function formatRecord(record: TeamRecord): string {
    return record.draws > 0
        ? `${record.wins}-${record.losses}-${record.draws}`
        : `${record.wins}-${record.losses}`;
}

/** "W3", "L2" — compact streak label. */
export function formatStreak(record: TeamRecord): string {
    if (!record.currentStreak) return '—';
    const letter = record.currentStreak.type === 'WIN' ? 'W' : record.currentStreak.type === 'LOSS' ? 'L' : 'D';
    return `${letter}${record.currentStreak.count}`;
}

/**
 * Sort teams into a standings table.
 *
 * Ordering: win percentage, then total wins, then point differential, then name —
 * the tiebreak chain most youth leagues use.
 */
export function sortStandings<T extends { record: TeamRecord; name: string }>(rows: T[]): T[] {
    return [...rows].sort((a, b) => {
        if (b.record.winPct !== a.record.winPct) return b.record.winPct - a.record.winPct;
        if (b.record.wins !== a.record.wins) return b.record.wins - a.record.wins;
        if (b.record.pointDifferential !== a.record.pointDifferential) {
            return b.record.pointDifferential - a.record.pointDifferential;
        }
        return a.name.localeCompare(b.name);
    });
}
