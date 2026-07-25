'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trophy, TrendingUp, TrendingDown, Minus, Target } from 'lucide-react';

interface SeasonRecord {
    wins: number;
    losses: number;
    draws: number;
    played: number;
    winPct: number;
    pointsFor: number;
    pointsAgainst: number;
    pointDifferential: number;
    form: ('WIN' | 'LOSS' | 'DRAW')[];
    currentStreak: { type: string; count: number } | null;
}

interface OpponentRecord extends SeasonRecord {
    opponent: string;
}

interface Game {
    id: string;
    title: string;
    startTime: string;
    opponentName: string | null;
    homeScore: number | null;
    awayScore: number | null;
    result: 'WIN' | 'LOSS' | 'DRAW' | null;
    scored: boolean;
}

interface TeamStanding {
    id: string;
    name: string;
    color: string;
    season: string | null;
    record: SeasonRecord;
    recordLabel: string;
    streakLabel: string;
    opponents: OpponentRecord[];
    recentGames: Game[];
    upcomingGames: { id: string; title: string; startTime: string; opponentName: string | null }[];
}

const RESULT_COLOR: Record<string, string> = {
    WIN: '#10b981',
    LOSS: '#ef4444',
    DRAW: '#f59e0b',
};

function FormPips({ form }: { form: ('WIN' | 'LOSS' | 'DRAW')[] }) {
    if (form.length === 0) {
        return <span style={{ color: 'var(--text-tertiary)', fontSize: '0.78rem' }}>No games yet</span>;
    }
    return (
        <div style={{ display: 'flex', gap: '0.2rem' }}>
            {form.map((r, i) => (
                <span
                    key={i}
                    title={r}
                    style={{
                        width: 20, height: 20, borderRadius: '50%', fontSize: '0.65rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `${RESULT_COLOR[r]}22`, color: RESULT_COLOR[r],
                    }}
                >
                    {r === 'WIN' ? 'W' : r === 'LOSS' ? 'L' : 'D'}
                </span>
            ))}
        </div>
    );
}

export default function StandingsPage() {
    const [teams, setTeams] = useState<TeamStanding[]>([]);
    const [summary, setSummary] = useState<{ wins: number; losses: number; draws: number; played: number; winPct: number; pointDifferential: number } | null>(null);
    const [activeTeamId, setActiveTeamId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/standings');
            const data = await res.json();
            if (data.success) {
                setTeams(data.data.teams);
                setSummary(data.data.summary);
                if (data.data.teams.length > 0) setActiveTeamId(data.data.teams[0].id);
            }
        } catch { /* empty state covers it */ }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const active = teams.find((t) => t.id === activeTeamId) ?? null;

    if (loading) {
        return <div className="page-content"><div className="card"><div className="skeleton" style={{ height: 140 }} /></div></div>;
    }

    const anyGames = teams.some((t) => t.record.played > 0);

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title page-title--gradient">Standings</h1>
                    <p className="page-subtitle">Season records, form and head-to-head results</p>
                </div>
            </div>

            {!anyGames ? (
                <div className="empty-state">
                    <div className="empty-state__icon"><Trophy /></div>
                    <h3 className="empty-state__title">No results yet</h3>
                    <p className="empty-state__description">
                        Records appear here once games have scores. Add a final score to any game on the schedule
                        and it will be counted automatically.
                    </p>
                </div>
            ) : (
                <>
                    {summary && summary.played > 0 && (
                        <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                            <div className="stat-card stat-card--primary">
                                <div className="stat-card__label">Overall record</div>
                                <div className="stat-card__value">
                                    {summary.wins}-{summary.losses}{summary.draws > 0 ? `-${summary.draws}` : ''}
                                </div>
                            </div>
                            <div className="stat-card stat-card--success">
                                <div className="stat-card__label">Win rate</div>
                                <div className="stat-card__value">{Math.round(summary.winPct * 100)}%</div>
                            </div>
                            <div className="stat-card stat-card--accent">
                                <div className="stat-card__label">Games played</div>
                                <div className="stat-card__value">{summary.played}</div>
                            </div>
                            <div className={`stat-card ${summary.pointDifferential >= 0 ? 'stat-card--success' : 'stat-card--danger'}`}>
                                <div className="stat-card__label">Point differential</div>
                                <div className="stat-card__value">
                                    {summary.pointDifferential > 0 ? '+' : ''}{summary.pointDifferential}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card" style={{ marginBottom: '1.5rem' }}>
                        <div className="card-header"><h2 className="card-title">Table</h2></div>
                        <div className="table-container">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th>Team</th>
                                        <th style={{ textAlign: 'center' }}>GP</th>
                                        <th style={{ textAlign: 'center' }}>W-L-D</th>
                                        <th style={{ textAlign: 'center' }}>Win %</th>
                                        <th style={{ textAlign: 'center' }}>PF</th>
                                        <th style={{ textAlign: 'center' }}>PA</th>
                                        <th style={{ textAlign: 'center' }}>Diff</th>
                                        <th style={{ textAlign: 'center' }}>Streak</th>
                                        <th>Form</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teams.map((t) => (
                                        <tr
                                            key={t.id}
                                            onClick={() => setActiveTeamId(t.id)}
                                            style={{
                                                cursor: 'pointer',
                                                background: t.id === activeTeamId ? 'rgba(59,130,246,0.08)' : undefined,
                                            }}
                                        >
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                                                    <div>
                                                        <div style={{ fontWeight: 600 }}>{t.name}</div>
                                                        {t.season && (
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>{t.season}</div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>{t.record.played}</td>
                                            <td style={{ textAlign: 'center', fontWeight: 600 }}>{t.recordLabel}</td>
                                            <td style={{ textAlign: 'center' }}>{Math.round(t.record.winPct * 100)}%</td>
                                            <td style={{ textAlign: 'center' }}>{t.record.pointsFor}</td>
                                            <td style={{ textAlign: 'center' }}>{t.record.pointsAgainst}</td>
                                            <td style={{
                                                textAlign: 'center',
                                                color: t.record.pointDifferential > 0 ? 'var(--success-400)'
                                                    : t.record.pointDifferential < 0 ? 'var(--danger-400)' : undefined,
                                            }}>
                                                {t.record.pointDifferential > 0 ? '+' : ''}{t.record.pointDifferential}
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span style={{
                                                    color: t.record.currentStreak?.type === 'WIN' ? 'var(--success-400)'
                                                        : t.record.currentStreak?.type === 'LOSS' ? 'var(--danger-400)'
                                                        : 'var(--text-secondary)',
                                                    fontWeight: 600,
                                                }}>
                                                    {t.streakLabel}
                                                </span>
                                            </td>
                                            <td><FormPips form={t.record.form} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {active && (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">Recent results — {active.name}</h2>
                                </div>
                                {active.recentGames.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>No games played yet.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {active.recentGames.map((g) => (
                                            <div key={g.id} style={{
                                                display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.65rem',
                                                borderRadius: 'var(--radius-md)', background: 'rgba(148,163,184,0.05)',
                                            }}>
                                                {g.result ? (
                                                    <span style={{
                                                        width: 24, height: 24, borderRadius: '50%', fontSize: '0.7rem', fontWeight: 700,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                                        background: `${RESULT_COLOR[g.result]}22`, color: RESULT_COLOR[g.result],
                                                    }}>
                                                        {g.result === 'WIN' ? 'W' : g.result === 'LOSS' ? 'L' : 'D'}
                                                    </span>
                                                ) : (
                                                    <span style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(148,163,184,0.15)', flexShrink: 0 }} />
                                                )}
                                                <div style={{ flex: 1, minWidth: 0 }}>
                                                    <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                                                        {g.opponentName ? `vs ${g.opponentName}` : g.title}
                                                    </div>
                                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                                        {new Date(g.startTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </div>
                                                </div>
                                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                                                    {g.scored ? `${g.homeScore}–${g.awayScore}` : (
                                                        <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontWeight: 400 }}>
                                                            No score
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="card">
                                <div className="card-header">
                                    <h2 className="card-title">Head to head</h2>
                                </div>
                                {active.opponents.length === 0 ? (
                                    <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                                        Record an opponent name on your games to build head-to-head records.
                                    </p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                                        {active.opponents.map((o) => {
                                            const trend = o.pointDifferential > 0 ? <TrendingUp size={14} color="var(--success-400)" />
                                                : o.pointDifferential < 0 ? <TrendingDown size={14} color="var(--danger-400)" />
                                                : <Minus size={14} color="var(--text-tertiary)" />;
                                            return (
                                                <div key={o.opponent} style={{
                                                    display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.65rem',
                                                    borderRadius: 'var(--radius-md)', background: 'rgba(148,163,184,0.05)',
                                                }}>
                                                    <Target size={15} color="var(--text-tertiary)" />
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{o.opponent}</div>
                                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                                            {o.played} game{o.played === 1 ? '' : 's'} · {o.pointsFor}–{o.pointsAgainst}
                                                        </div>
                                                    </div>
                                                    {trend}
                                                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                                                        {o.wins}-{o.losses}{o.draws > 0 ? `-${o.draws}` : ''}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
