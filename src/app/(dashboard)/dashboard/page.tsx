'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { Calendar, Users, UserPlus, MessageCircle, CreditCard, Megaphone, AlertTriangle, ClipboardList } from 'lucide-react';
import { EVENT_TYPE_COLORS } from '@/lib/constants';

import ParentDashboard from './components/ParentDashboard';
import PlayerDashboard from './components/PlayerDashboard';
import PendingTasks from './components/PendingTasks';

export default function DashboardPage() {
    const { user } = useAuth();
    if (!user) return null;
    if (user.role === 'PARENT') return <ParentDashboard user={user} />;
    if (user.role === 'PLAYER') return <PlayerDashboard user={user} />;
    return <AdminDashboard user={user} />;
}

interface Event {
    id: string;
    title: string;
    type: string;
    startTime: string;
    teamName: string;
    isCancelled: boolean;
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

const PRIORITY_COLORS: Record<string, string> = {
    LOW: 'var(--text-tertiary)',
    NORMAL: 'var(--primary-500)',
    HIGH: 'var(--warning-500)',
    URGENT: 'var(--danger-500)',
};

function formatEventDate(iso: string): string {
    const d = new Date(iso);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

    const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    if (isSameDay(d, today)) return `Today, ${time}`;
    if (isSameDay(d, tomorrow)) return `Tomorrow, ${time}`;
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) + `, ${time}`;
}

function AdminDashboard({ user }: { user: { name: string; role: string; coachApproved: boolean } }) {
    const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [rosterCount, setRosterCount] = useState<number | null>(null);
    const [pendingInvoiceCount, setPendingInvoiceCount] = useState<number | null>(null);
    const [showAnnouncementForm, setShowAnnouncementForm] = useState(false);
    const [announcementForm, setAnnouncementForm] = useState({ teamId: '', title: '', body: '', priority: 'NORMAL' });
    const [posting, setPosting] = useState(false);

    const isStaff = user.role === 'ADMIN' || (user.role === 'COACH' && user.coachApproved);

    useEffect(() => {
        Promise.all([
            fetch('/api/teams').then(r => r.json()),
            fetch('/api/events').then(r => r.json()),
            fetch('/api/announcements').then(r => r.json()),
            fetch('/api/roster').then(r => r.json()),
            fetch('/api/invoices').then(r => r.json()),
        ]).then(([teamsData, eventsData, announcementsData, rosterData, invoicesData]) => {
            if (teamsData.success) setTeams(teamsData.data);
            if (eventsData.success) setEvents(eventsData.data);
            if (announcementsData.success) setAnnouncements(announcementsData.data);
            if (rosterData.success) setRosterCount(rosterData.data.length);
            if (invoicesData.success) {
                setPendingInvoiceCount(
                    invoicesData.data.filter((i: { status: string }) =>
                        i.status === 'PENDING' || i.status === 'OVERDUE'
                    ).length
                );
            }
        }).catch(console.error);
    }, []);

    const now = new Date();
    const upcomingEvents = events
        .filter(e => !e.isCancelled && new Date(e.startTime) > now)
        .slice(0, 5);

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
                const updated = await fetch('/api/announcements').then(r => r.json());
                if (updated.success) setAnnouncements(updated.data);
            }
        } catch (err) {
            console.error('Failed to post announcement', err);
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="page-content">
            {/* Header */}
            <div className="page-header">
                <div>
                    <h1 className="page-title page-title--gradient">Welcome back, {user.name.split(' ')[0]}</h1>
                    <p className="page-subtitle">Here&apos;s what&apos;s happening across your teams.</p>
                </div>
                {isStaff && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%' }}>
                        <Link href="/teams" className="btn btn-outline" style={{ flex: '1 1 auto', justifyContent: 'center' }}>
                            + New Team
                        </Link>
                        <Link href="/schedule" className="btn btn-primary" style={{ flex: '1 1 auto', justifyContent: 'center' }}>
                            + New Event
                        </Link>
                    </div>
                )}
            </div>

            {user.role === 'COACH' && !user.coachApproved && (
                <div className="card" style={{ marginBottom: '1.5rem', borderColor: 'rgba(245, 158, 11, 0.35)', background: 'rgba(245, 158, 11, 0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                        <AlertTriangle size={20} color="var(--warning-400)" />
                        <div>
                            <div style={{ fontWeight: 800, marginBottom: '0.35rem' }}>Coach access pending approval</div>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>
                                Your coach request is waiting for admin approval. Team creation, roster management, scheduling,
                                invoices, announcements, analytics, and practice plans unlock after approval.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Stat Cards */}
            <div className="grid-stats">
                <Link href="/teams" className="stat-card stat-card--primary card-interactive" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-card__label">Teams</div>
                    <div className="stat-card__value">{teams.length}</div>
                    <div className="stat-card__change stat-card__change--up">Active this season</div>
                </Link>
                <Link href="/roster" className="stat-card stat-card--accent card-interactive" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-card__label">Players</div>
                    <div className="stat-card__value">{rosterCount ?? '—'}</div>
                    <div className="stat-card__change">Across all teams</div>
                </Link>
                <Link href="/schedule" className="stat-card stat-card--success card-interactive" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-card__label">Upcoming Events</div>
                    <div className="stat-card__value">{upcomingEvents.length}</div>
                    <div className="stat-card__change">Scheduled ahead</div>
                </Link>
                <Link href="/payments" className="stat-card stat-card--warning card-interactive" style={{ display: 'block', textDecoration: 'none', color: 'inherit' }}>
                    <div className="stat-card__label">Pending Payments</div>
                    <div className="stat-card__value">{pendingInvoiceCount ?? '—'}</div>
                    <div className="stat-card__change stat-card__change--down">Awaiting payment</div>
                </Link>
            </div>

            {/* Two-column */}
            <div className="grid-cards">
                {/* Upcoming Events */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Upcoming Events</h2>
                        <Link href="/schedule" className="btn btn-ghost btn-sm">View all →</Link>
                    </div>
                    {upcomingEvents.length === 0 ? (
                        <div className="empty-state" style={{ padding: '2rem 0' }}>
                            <div className="empty-state__icon"><Calendar size={28} /></div>
                            <p className="empty-state__description">No upcoming events scheduled.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {upcomingEvents.map((event) => (
                                <Link
                                    key={event.id}
                                    href={`/schedule?eventId=${event.id}`}
                                    className="card-interactive"
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', padding: '0.625rem 0.75rem', borderRadius: '8px', textDecoration: 'none', color: 'inherit' }}
                                >
                                    <div style={{ width: 3, height: 36, borderRadius: 2, background: EVENT_TYPE_COLORS[event.type] ?? '#64748b', flexShrink: 0 }} />
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{event.title}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                            {formatEventDate(event.startTime)} · {event.teamName}
                                        </div>
                                    </div>
                                    <span className="badge" style={{ fontSize: '0.65rem', background: `${EVENT_TYPE_COLORS[event.type]}18`, color: EVENT_TYPE_COLORS[event.type] ?? '#64748b', border: 'none', flexShrink: 0 }}>
                                        {event.type}
                                    </span>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pending Tasks */}
                {isStaff && <PendingTasks />}

                {/* Announcements */}
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Announcements</h2>
                        {isStaff && (
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => setShowAnnouncementForm(!showAnnouncementForm)}
                            >
                                {showAnnouncementForm ? 'Cancel' : '+ Post'}
                            </button>
                        )}
                    </div>

                    {showAnnouncementForm && (
                        <form onSubmit={handlePostAnnouncement} className="glass-subtle" style={{ marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', padding: '0.875rem' }}>
                            <select
                                value={announcementForm.teamId}
                                onChange={(e) => setAnnouncementForm(f => ({ ...f, teamId: e.target.value }))}
                                className="form-input"
                                required
                            >
                                <option value="">Select team…</option>
                                {teams.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <input
                                type="text"
                                placeholder="Title"
                                value={announcementForm.title}
                                onChange={(e) => setAnnouncementForm(f => ({ ...f, title: e.target.value }))}
                                className="form-input"
                                required
                            />
                            <textarea
                                placeholder="Write your announcement…"
                                value={announcementForm.body}
                                onChange={(e) => setAnnouncementForm(f => ({ ...f, body: e.target.value }))}
                                className="form-input"
                                rows={3}
                                required
                            />
                            <div style={{ display: 'flex', gap: '0.625rem', alignItems: 'center' }}>
                                <select
                                    value={announcementForm.priority}
                                    onChange={(e) => setAnnouncementForm(f => ({ ...f, priority: e.target.value }))}
                                    className="form-input"
                                    style={{ flex: '0 0 auto', width: 'auto' }}
                                >
                                    <option value="LOW">Low</option>
                                    <option value="NORMAL">Normal</option>
                                    <option value="HIGH">High</option>
                                    <option value="URGENT">Urgent</option>
                                </select>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={posting} style={{ marginLeft: 'auto' }}>
                                    {posting ? 'Posting…' : 'Post'}
                                </button>
                            </div>
                        </form>
                    )}

                    {announcements.length === 0 ? (
                        <div className="empty-state" style={{ padding: '2rem 0' }}>
                            <div className="empty-state__icon"><Megaphone size={28} /></div>
                            <p className="empty-state__description">No announcements yet.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: 480, overflowY: 'auto', paddingRight: '0.25rem' }}>
                            {announcements.slice(0, 5).map((a) => (
                                <div
                                    key={a.id}
                                    className="glass-subtle"
                                    style={{
                                        padding: '0.625rem 0.75rem',
                                        borderLeft: `3px solid ${PRIORITY_COLORS[a.priority] ?? 'var(--primary-500)'}`,
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{a.title}</div>
                                        {a.priority === 'URGENT' && <AlertTriangle size={14} color="var(--danger-500)" style={{ flexShrink: 0, marginTop: 2 }} />}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: '0.8rem',
                                            color: 'var(--text-secondary)',
                                            marginTop: '0.25rem',
                                            display: '-webkit-box',
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: 'vertical',
                                            overflow: 'hidden',
                                        }}
                                    >
                                        {a.body}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', marginTop: '0.375rem' }}>
                                        {a.teamName} · {a.authorName} · {new Date(a.createdAt).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Actions */}
            {isStaff && (
                <div className="card" style={{ marginTop: '1.5rem' }}>
                    <h2 className="card-title" style={{ marginBottom: '0.875rem' }}>Quick Actions</h2>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                        <Link href="/teams" className="btn btn-outline btn-sm" style={{ gap: '0.375rem' }}>
                            <Users size={14} /> Create Team
                        </Link>
                        <Link href="/schedule" className="btn btn-outline btn-sm" style={{ gap: '0.375rem' }}>
                            <Calendar size={14} /> Schedule Event
                        </Link>
                        <Link href="/roster" className="btn btn-outline btn-sm" style={{ gap: '0.375rem' }}>
                            <UserPlus size={14} /> Add Player
                        </Link>
                        <Link href="/chat" className="btn btn-outline btn-sm" style={{ gap: '0.375rem' }}>
                            <MessageCircle size={14} /> Send Message
                        </Link>
                        <Link href="/payments" className="btn btn-outline btn-sm" style={{ gap: '0.375rem' }}>
                            <CreditCard size={14} /> Create Invoice
                        </Link>
                        <Link href="/roster" className="btn btn-outline btn-sm" style={{ gap: '0.375rem' }}>
                            <ClipboardList size={14} /> View Roster
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
