'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';

import ParentDashboard from './components/ParentDashboard';
import PlayerDashboard from './components/PlayerDashboard';

interface DashboardData {
    stats: {
        totalTeams: number;
        totalPlayers: number;
        upcomingEvents: number;
        pendingPayments: number;
    };
    recentActivity: Array<{
        id: string;
        icon: string;
        text: string;
        time: string;
    }>;
    upcomingEvents: Array<{
        id: string;
        title: string;
        type: string;
        date: string;
        team: string;
        rsvpCount: number;
    }>;
}

export default function DashboardPage() {
    const { user } = useAuth();

    if (!user) return null;

    if (user.role === 'PARENT') {
        return <ParentDashboard user={user} />;
    }

    if (user.role === 'PLAYER') {
        return <PlayerDashboard user={user} />;
    }

    return <AdminDashboard user={user} />;
}

interface Announcement {
    id: string;
    teamId: string;
    teamName: string;
    teamColor: string;
    authorName: string;
    title: string;
    body: string;
    priority: string;
    pinned: boolean;
    createdAt: string;
}

function AdminDashboard({ user }: { user: any }) {
    const [data, setData] = useState<DashboardData | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
    const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
    const [announcementForm, setAnnouncementForm] = useState({ teamId: '', title: '', body: '', priority: 'NORMAL' });
    const [posting, setPosting] = useState(false);
    const isStaff = user?.role === 'ADMIN' || user?.role === 'COACH';

    const loadAnnouncements = async () => {
        const res = await fetch('/api/announcements');
        const data = await res.json();
        if (data.success) setAnnouncements(data.data);
    };

    const loadTeams = async () => {
        const res = await fetch('/api/teams');
        const data = await res.json();
        if (data.success) setTeams(data.data);
    };

    useEffect(() => {
        loadAnnouncements();
        loadTeams();
        // Simulated dashboard data for MVP
        setData({
            stats: {
                totalTeams: 3,
                totalPlayers: 42,
                upcomingEvents: 8,
                pendingPayments: 5,
            },
            recentActivity: [
                { id: '1', icon: '👤', text: 'Sarah Johnson joined Thunder FC', time: '2 hours ago' },
                { id: '2', icon: '📅', text: 'Practice scheduled for Saturday 10AM', time: '3 hours ago' },
                { id: '3', icon: '✅', text: '12 players confirmed for Friday game', time: '5 hours ago' },
                { id: '4', icon: '💵', text: 'Payment received from Mike Davis', time: '1 day ago' },
                { id: '5', icon: '📢', text: 'New announcement posted in Lightning Squad', time: '1 day ago' },
            ],
            upcomingEvents: [
                { id: '1', title: 'Practice Session', type: 'PRACTICE', date: 'Tomorrow, 4:00 PM', team: 'Thunder FC', rsvpCount: 14 },
                { id: '2', title: 'vs Phoenix United', type: 'GAME', date: 'Saturday, 10:00 AM', team: 'Thunder FC', rsvpCount: 18 },
                { id: '3', title: 'Team Meeting', type: 'MEETING', date: 'Monday, 6:00 PM', team: 'Lightning Squad', rsvpCount: 8 },
            ],
        });
    }, []);

    const handlePostAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!announcementForm.teamId || !announcementForm.title || !announcementForm.body) return;
        setPosting(true);
        try {
            const res = await fetch('/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(announcementForm),
            });
            const data = await res.json();
            if (data.success) {
                setAnnouncementForm({ teamId: '', title: '', body: '', priority: 'NORMAL' });
                setShowAnnouncementForm(false);
                loadAnnouncements();
            }
        } catch (err) {
            console.error('Failed to post announcement', err);
        } finally {
            setPosting(false);
        }
    };

    const eventColors: Record<string, string> = {
        PRACTICE: '#3b82f6',
        GAME: '#ef4444',
        MEETING: '#f59e0b',
        OTHER: '#8b5cf6',
    };

    return (
        <div className="page-content">
            {/* Welcome Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Welcome back, {user?.name?.split(' ')[0]} 👋
                    </h1>
                    <p className="page-subtitle">Here&apos;s what&apos;s happening across your teams.</p>
                </div>
                {isStaff && (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <Link href="/teams" className="btn btn-outline">
                            + New Team
                        </Link>
                        <Link href="/schedule" className="btn btn-primary">
                            + New Event
                        </Link>
                    </div>
                )}
            </div>

            {/* Stat Cards */}
            {data && (
                <div className="grid-stats">
                    <div className="stat-card stat-card--primary">
                        <div className="stat-card__label">Total Teams</div>
                        <div className="stat-card__value">{data.stats.totalTeams}</div>
                        <div className="stat-card__change stat-card__change--up">↑ Active this season</div>
                    </div>
                    <div className="stat-card stat-card--accent">
                        <div className="stat-card__label">Total Players</div>
                        <div className="stat-card__value">{data.stats.totalPlayers}</div>
                        <div className="stat-card__change stat-card__change--up">↑ 3 new this week</div>
                    </div>
                    <div className="stat-card stat-card--success">
                        <div className="stat-card__label">Upcoming Events</div>
                        <div className="stat-card__value">{data.stats.upcomingEvents}</div>
                        <div className="stat-card__change">Next 7 days</div>
                    </div>
                    <div className="stat-card stat-card--warning">
                        <div className="stat-card__label">Pending Payments</div>
                        <div className="stat-card__value">{data.stats.pendingPayments}</div>
                        <div className="stat-card__change stat-card__change--down">$350 outstanding</div>
                    </div>
                </div>
            )}

            {/* Two Column Layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                {/* Upcoming Events */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Upcoming Events</h2>
                        <Link href="/schedule" className="btn btn-ghost btn-sm">View All →</Link>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        {data?.upcomingEvents.map((event) => (
                            <Link href={`/schedule?eventId=${event.id}`} key={event.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '1rem',
                                padding: '0.75rem',
                                borderRadius: '0.75rem',
                                background: 'var(--surface-700)',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                                textDecoration: 'none',
                                color: 'inherit',
                            }} className="card-interactive">
                                <div style={{
                                    width: '4px',
                                    height: '40px',
                                    borderRadius: '2px',
                                    background: eventColors[event.type] || '#64748b',
                                    flexShrink: 0,
                                }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{event.title}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {event.date} · {event.team}
                                    </div>
                                </div>
                                <div style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-secondary)',
                                    textAlign: 'right',
                                    flexShrink: 0,
                                }}>
                                    <div style={{ color: 'var(--success-400)', fontWeight: 600 }}>
                                        {event.rsvpCount} RSVPs
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Recent Activity</h2>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {data?.recentActivity.map((activity) => (
                            <div key={activity.id} style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.75rem',
                                padding: '0.625rem 0',
                                borderBottom: '1px solid var(--surface-700)',
                            }}>
                                <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>{activity.icon}</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                                        {activity.text}
                                    </div>
                                </div>
                                <span style={{
                                    fontSize: '0.7rem',
                                    color: 'var(--text-tertiary)',
                                    whiteSpace: 'nowrap',
                                    flexShrink: 0,
                                }}>
                                    {activity.time}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            {isStaff && (
                <div style={{ marginTop: '1.5rem' }}>
                    <div className="card">
                        <h2 className="card-title" style={{ marginBottom: '1rem' }}>Quick Actions</h2>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                            <Link href="/teams" className="btn btn-outline">👥 Create Team</Link>
                            <Link href="/schedule" className="btn btn-outline">📅 Schedule Event</Link>
                            <Link href="/roster" className="btn btn-outline">🏃 Add Player</Link>
                            <Link href="/chat" className="btn btn-outline">💬 Send Message</Link>
                            <Link href="/payments" className="btn btn-outline">💵 Create Invoice</Link>
                        </div>
                    </div>
                </div>
            )}

            {/* Announcements */}
            {isStaff && (
                <div style={{ marginTop: '1.5rem' }}>
                    <div className="card">
                        <div className="card-header">
                            <h2 className="card-title">📢 Team Announcements</h2>
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                            >
                                {showAnnouncementForm ? 'Cancel' : '+ New Announcement'}
                            </button>
                        </div>

                        {showAnnouncementForm && (
                            <form onSubmit={handlePostAnnouncement} style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem', background: 'var(--surface-700)', borderRadius: '0.75rem' }}>
                                <select
                                    value={announcementForm.teamId}
                                    onChange={(e) => setAnnouncementForm(f => ({ ...f, teamId: e.target.value }))}
                                    className="form-input"
                                    required
                                >
                                    <option value="">Select Team</option>
                                    {teams.map((t) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    placeholder="Announcement title"
                                    value={announcementForm.title}
                                    onChange={(e) => setAnnouncementForm(f => ({ ...f, title: e.target.value }))}
                                    className="form-input"
                                    required
                                />
                                <textarea
                                    placeholder="Write your announcement..."
                                    value={announcementForm.body}
                                    onChange={(e) => setAnnouncementForm(f => ({ ...f, body: e.target.value }))}
                                    className="form-input"
                                    rows={3}
                                    required
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                    <select
                                        value={announcementForm.priority}
                                        onChange={(e) => setAnnouncementForm(f => ({ ...f, priority: e.target.value }))}
                                        className="form-input"
                                        style={{ flex: '0 0 auto', width: 'auto' }}
                                    >
                                        <option value="LOW">Low Priority</option>
                                        <option value="NORMAL">Normal</option>
                                        <option value="HIGH">High Priority</option>
                                        <option value="URGENT">🚨 Urgent</option>
                                    </select>
                                    <button type="submit" className="btn btn-primary" disabled={posting} style={{ marginLeft: 'auto' }}>
                                        {posting ? 'Posting...' : 'Post Announcement'}
                                    </button>
                                </div>
                            </form>
                        )}

                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {announcements.length === 0 ? (
                                <p style={{ color: 'var(--text-secondary)' }}>No announcements yet. Post one above!</p>
                            ) : (
                                announcements.slice(0, 5).map((a) => {
                                    const priorityColors: Record<string, string> = {
                                        LOW: 'var(--text-tertiary)',
                                        NORMAL: 'var(--primary-400)',
                                        HIGH: '#f59e0b',
                                        URGENT: '#ef4444',
                                    };
                                    return (
                                        <div key={a.id} style={{
                                            padding: '0.75rem',
                                            background: 'var(--surface-700)',
                                            borderRadius: '0.5rem',
                                            borderLeft: `3px solid ${priorityColors[a.priority] || 'var(--primary-400)'}`,
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.title}</div>
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    fontWeight: 600,
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    background: (priorityColors[a.priority] || 'var(--primary-400)') + '20',
                                                    color: priorityColors[a.priority] || 'var(--primary-400)',
                                                }}>{a.priority}</span>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{a.body}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                                                {a.teamName} · {a.authorName} · {new Date(a.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
