'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils';
import { BarChart3, TrendingUp, Users, DollarSign, Download } from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale, LinearScale, BarElement,
    PointElement, LineElement,
    Title, Tooltip, Legend, Filler,
);

interface AttendanceRow {
    name: string;
    present: number;
    total: number;
    pct: number;
}

interface RevenuePoint {
    month: string;
    amount: number;
}

interface EffortPlayer {
    name: string;
    ratings: Array<{ date: string; rating: number }>;
}

interface AnalyticsData {
    attendanceByPlayer: AttendanceRow[];
    revenueByMonth: RevenuePoint[];
    effortTrend: EffortPlayer[];
    summary: {
        upcomingInvoices: number;
        overdueAmount: number;
        totalCollected: number;
        totalPlayers: number;
    };
}

const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: 'var(--text-secondary)', font: { size: 12 } } },
    },
    scales: {
        x: { ticks: { color: 'var(--text-secondary)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        y: { ticks: { color: 'var(--text-secondary)' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    },
};

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/analytics')
            .then((r) => r.json())
            .then((res) => { if (res.success) setData(res.data); })
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <div className="page-content">
                <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>Loading analytics…</div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="page-content">
                <div className="empty-state"><div className="empty-state__icon"><BarChart3 /></div><p>No analytics data available.</p></div>
            </div>
        );
    }

    const { attendanceByPlayer, revenueByMonth, effortTrend, summary } = data;

    const revenueChartData = {
        labels: revenueByMonth.map((r) => r.month),
        datasets: [{
            label: 'Revenue Collected ($)',
            data: revenueByMonth.map((r) => r.amount),
            backgroundColor: 'rgba(59,130,246,0.7)',
            borderColor: '#3b82f6',
            borderWidth: 1,
            borderRadius: 4,
        }],
    };

    const playerForEffort = selectedPlayer
        ? effortTrend.find((p) => p.name === selectedPlayer)
        : effortTrend[0];

    const effortChartData = playerForEffort ? {
        labels: playerForEffort.ratings.map((r) => r.date),
        datasets: [{
            label: `${playerForEffort.name} — Effort Rating`,
            data: playerForEffort.ratings.map((r) => r.rating),
            borderColor: '#8b5cf6',
            backgroundColor: 'rgba(139,92,246,0.15)',
            pointBackgroundColor: '#8b5cf6',
            tension: 0.3,
            fill: true,
        }],
    } : null;

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title page-title--gradient">Analytics</h1>
                    <p className="page-subtitle">Season performance at a glance</p>
                </div>
                <a
                    href="/api/attendance?format=csv"
                    download="attendance.csv"
                    className="btn btn-ghost"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', whiteSpace: 'nowrap' }}
                >
                    <Download size={15} /> Export Attendance
                </a>
            </div>

            {/* Summary Cards */}
            <div className="grid-stats" style={{ marginBottom: '2rem' }}>
                <div className="stat-card stat-card--primary">
                    <div className="stat-card__label">Total Collected</div>
                    <div className="stat-card__value">{formatCurrency(summary.totalCollected)}</div>
                    <div className="stat-card__change stat-card__change--up">Paid invoices</div>
                </div>
                <div className="stat-card stat-card--warning">
                    <div className="stat-card__label">Due in 30 Days</div>
                    <div className="stat-card__value">{formatCurrency(summary.upcomingInvoices)}</div>
                    <div className="stat-card__change">Upcoming payments</div>
                </div>
                <div className="stat-card" style={{ background: 'var(--surface-700)' }}>
                    <div className="stat-card__label">Overdue</div>
                    <div className="stat-card__value" style={{ color: 'var(--danger-400)' }}>{formatCurrency(summary.overdueAmount)}</div>
                    <div className="stat-card__change stat-card__change--down">Needs attention</div>
                </div>
                <div className="stat-card stat-card--accent">
                    <div className="stat-card__label">Players Tracked</div>
                    <div className="stat-card__value">{summary.totalPlayers}</div>
                    <div className="stat-card__change">With attendance data</div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>

                {/* Revenue Chart */}
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        <DollarSign size={18} style={{ color: 'var(--primary-400)' }} />
                        <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Revenue by Month</h2>
                    </div>
                    {revenueByMonth.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>No paid invoices yet.</div>
                    ) : (
                        <div style={{ height: 240 }}>
                            <Bar data={revenueChartData} options={{
                                ...chartDefaults,
                                plugins: {
                                    ...chartDefaults.plugins,
                                    legend: { display: false },
                                    tooltip: { callbacks: { label: (ctx) => ` $${(ctx.parsed.y ?? 0).toFixed(2)}` } },
                                },
                            }} />
                        </div>
                    )}
                </div>

                {/* Effort Trend Chart */}
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <TrendingUp size={18} style={{ color: 'var(--accent-400)' }} />
                            <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Effort Trend</h2>
                        </div>
                        {effortTrend.length > 1 && (
                            <select
                                className="form-input"
                                style={{ fontSize: '0.8rem', padding: '0.25rem 0.5rem', width: 'auto' }}
                                value={selectedPlayer || effortTrend[0]?.name || ''}
                                onChange={(e) => setSelectedPlayer(e.target.value)}
                            >
                                {effortTrend.map((p) => (
                                    <option key={p.name} value={p.name}>{p.name}</option>
                                ))}
                            </select>
                        )}
                    </div>
                    {!effortChartData ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>No effort ratings recorded yet.</div>
                    ) : (
                        <div style={{ height: 240 }}>
                            <Line data={effortChartData} options={{
                                ...chartDefaults,
                                plugins: { ...chartDefaults.plugins, legend: { display: false } },
                                scales: {
                                    ...chartDefaults.scales,
                                    y: { ...chartDefaults.scales.y, min: 1, max: 5, ticks: { color: 'var(--text-secondary)', stepSize: 1 } },
                                },
                            }} />
                        </div>
                    )}
                </div>

                {/* Attendance Table */}
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem', gridColumn: 'span 2' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                        <Users size={18} style={{ color: 'var(--success-400)' }} />
                        <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Attendance by Player</h2>
                    </div>
                    {attendanceByPlayer.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-secondary)' }}>No attendance records yet.</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--surface-600)' }}>
                                        {['Player', 'Present', 'Total', 'Attendance %', ''].map((h) => (
                                            <th key={h} style={{ textAlign: 'left', padding: '0.5rem 0.75rem', color: 'var(--text-secondary)', fontWeight: 600, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {attendanceByPlayer.map((row) => (
                                        <tr key={row.name} style={{ borderBottom: '1px solid var(--surface-700)' }}>
                                            <td style={{ padding: '0.625rem 0.75rem', fontWeight: 600 }}>{row.name}</td>
                                            <td style={{ padding: '0.625rem 0.75rem', color: 'var(--success-400)' }}>{row.present}</td>
                                            <td style={{ padding: '0.625rem 0.75rem', color: 'var(--text-secondary)' }}>{row.total}</td>
                                            <td style={{ padding: '0.625rem 0.75rem' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--surface-600)', overflow: 'hidden' }}>
                                                        <div style={{
                                                            width: `${row.pct}%`,
                                                            height: '100%',
                                                            borderRadius: 3,
                                                            background: row.pct >= 80 ? 'var(--success-400)' : row.pct >= 50 ? 'var(--warning-400)' : 'var(--danger-400)',
                                                            transition: 'width 0.4s ease',
                                                        }} />
                                                    </div>
                                                    <span style={{ minWidth: 36, fontWeight: 600, color: row.pct >= 80 ? 'var(--success-400)' : row.pct >= 50 ? 'var(--warning-400)' : 'var(--danger-400)' }}>{row.pct}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: '0.625rem 0.75rem' }}>
                                                <span style={{
                                                    fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '1rem',
                                                    background: row.pct >= 80 ? 'rgba(34,197,94,0.15)' : row.pct >= 50 ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                                                    color: row.pct >= 80 ? 'var(--success-400)' : row.pct >= 50 ? 'var(--warning-400)' : 'var(--danger-400)',
                                                }}>
                                                    {row.pct >= 80 ? 'On Track' : row.pct >= 50 ? 'At Risk' : 'Concern'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
