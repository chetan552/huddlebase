'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface Event {
    id: string;
    title: string;
    type: string;
    startTime: string;
    endTime: string | null;
    location: string | null;
    teamName: string;
    teamColor: string;
    isCancelled: boolean;
    opponentName: string | null;
    homeScore: number | null;
    awayScore: number | null;
    result: string | null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const typeColors: Record<string, string> = {
    PRACTICE: 'var(--primary-400)',
    GAME: 'var(--danger-400)',
    MEETING: 'var(--accent-400)',
    OTHER: 'var(--warning-400)',
};

const TYPE_BADGE_CLASS: Record<string, string> = {
    PRACTICE: 'badge-event-practice',
    GAME: 'badge-event-game',
    MEETING: 'badge-event-meeting',
    OTHER: 'badge-event-other',
};

const statusColors: Record<string, string> = {
    GOING: 'var(--success-400)',
    PENDING: 'var(--warning-400)',
    NOT_GOING: 'var(--danger-400)',
};

interface RSVP {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    status: string;
    note: string | null;
    updatedAt: string;
}

export default function SchedulePage() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string | null>(null);
    const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
    const [formData, setFormData] = useState({
        title: '', type: 'PRACTICE', teamId: '', location: '',
        startTime: '', endTime: '', notes: '',
        opponentName: '', homeScore: '', awayScore: '', result: '',
    });
    const [loading, setLoading] = useState(false);
    const [selectedEventRsvps, setSelectedEventRsvps] = useState<Event | null>(null);
    const [rsvps, setRsvps] = useState<RSVP[]>([]);
    const [loadingRsvps, setLoadingRsvps] = useState(false);
    const [children, setChildren] = useState<Array<{ id: string; name: string }>>([]);
    const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
    const searchParams = useSearchParams();
    const isStaff = user?.role === 'ADMIN' || user?.role === 'COACH';
    const isParent = user?.role === 'PARENT';

    const fetchEvents = async () => {
        try {
            const res = await fetch('/api/events');
            const data = await res.json();
            if (data.success) setEvents(data.data);
        } catch (err) {
            console.error('Failed to fetch events:', err);
        }
    };

    const fetchTeams = async () => {
        try {
            const res = await fetch('/api/teams');
            const data = await res.json();
            if (data.success) setTeams(data.data);
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        }
    };

    useEffect(() => {
        fetchEvents();
        fetchTeams();
        if (isParent) {
            fetch('/api/family').then(r => r.json()).then(data => {
                if (data.success && data.data.length > 0) {
                    setChildren(data.data.map((c: any) => ({ id: c.id, name: c.name })));
                    setSelectedChildId(data.data[0].id);
                }
            }).catch(console.error);
        }
    }, []);

    useEffect(() => {
        // Auto-scroll to today's date
        setTimeout(() => {
            document.getElementById('today-cell')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }, [currentDate]);

    const fetchRsvps = async (eventId: string) => {
        setLoadingRsvps(true);
        try {
            const res = await fetch(`/api/events/${eventId}/rsvps`);
            const data = await res.json();
            if (data.success) {
                // Sort so GOING is first, then PENDING, then NOT_GOING
                const statusOrder: Record<string, number> = { GOING: 1, PENDING: 2, NOT_GOING: 3 };
                data.data.sort((a: RSVP, b: RSVP) => (statusOrder[a.status] || 4) - (statusOrder[b.status] || 4));
                setRsvps(data.data);
            }
        } catch (err) { console.error('Failed to fetch RSVPs:', err); }
        setLoadingRsvps(false);
    };

    const handleEventClick = (e: React.MouseEvent, ev: Event) => {
        e.stopPropagation();
        setSelectedEventRsvps(ev);
        fetchRsvps(ev.id);
    };

    const handleCancelEvent = async () => {
        if (!selectedEventRsvps) return;
        try {
            const res = await fetch(`/api/events/${selectedEventRsvps.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isCancelled: true }),
            });
            if (res.ok) {
                setSelectedEventRsvps((prev) => prev ? { ...prev, isCancelled: true } : null);
                fetchEvents();
            }
        } catch (err) {
            console.error('Failed to cancel event:', err);
        }
    };

    const handleRsvp = async (status: string) => {
        if (!selectedEventRsvps) return;
        const body: any = { status };
        if (isParent && selectedChildId) {
            body.userId = selectedChildId;
        }
        try {
            const res = await fetch(`/api/events/${selectedEventRsvps.id}/rsvps`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });
            if (res.ok) {
                fetchRsvps(selectedEventRsvps.id);
            }
        } catch (err) {
            console.error('Failed to update RSVP:', err);
        }
    };

    useEffect(() => {
        const eventId = searchParams?.get('eventId');
        if (eventId && events.length > 0) {
            const evt = events.find(e => e.id === eventId);
            if (evt) {
                setSelectedEventRsvps(evt);
                fetchRsvps(evt.id);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchParams, events]);

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const calendarDays = [];
    for (let i = 0; i < firstDay; i++) calendarDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) calendarDays.push(d);

    const getEventsForDay = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return events.filter((e) => e.startTime.startsWith(dateStr));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/events', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                setFormData({ title: '', type: 'PRACTICE', teamId: '', location: '', startTime: '', endTime: '', notes: '', opponentName: '', homeScore: '', awayScore: '', result: '' });
                fetchEvents();
            }
        } catch (err) {
            console.error('Failed to create event:', err);
        }
        setLoading(false);
    };

    return (
        <div className="page-content">
            <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 auto' }}>
                    <h1 className="page-title page-title--gradient">Schedule</h1>
                    <p className="page-subtitle">Manage practices, games, and events</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                    <div className="glass-subtle" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.25rem' }}>
                        <button className="btn btn-ghost btn-icon" style={{ width: 36, height: 36 }} onClick={() => setCurrentDate(new Date(year, month - 1, 1))} aria-label="Previous month">
                            <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontWeight: 600, minWidth: '140px', textAlign: 'center' }}>
                            {MONTHS[month]} {year}
                        </span>
                        <button className="btn btn-ghost btn-icon" style={{ width: 36, height: 36 }} onClick={() => setCurrentDate(new Date(year, month + 1, 1))} aria-label="Next month">
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {isStaff && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ whiteSpace: 'nowrap' }}>
                            + New Event
                        </button>
                    )}
                </div>
            </div>

            {/* Calendar Header */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>

                {/* Day Headers */}
                <div className="grid-calendar hide-mobile">
                    {DAYS.map((day) => (
                        <div key={day} style={{
                            textAlign: 'center', padding: '0.5rem',
                            fontSize: '0.75rem', fontWeight: 600,
                            color: 'var(--text-tertiary)', textTransform: 'uppercase',
                        }}>
                            {day}
                        </div>
                    ))}
                </div>

                {/* Calendar Cells */}
                <div className="grid-calendar">
                    {calendarDays.map((day, i) => {
                        if (day === null) {
                            return <div key={`empty-${i}`} className="hide-mobile" style={{ minHeight: '100px' }} />;
                        }
                        const dayEvents = getEventsForDay(day);
                        const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

                        return (
                            <div
                                key={day}
                                id={isToday ? "today-cell" : undefined}
                                onClick={() => {
                                    if (!isStaff) return;
                                    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    setSelectedDate(dateStr);
                                    setFormData((prev) => ({ ...prev, startTime: `${dateStr}T16:00` }));
                                    setShowModal(true);
                                }}
                                className={`calendar-day-cell ${isToday ? 'calendar-day-cell--today' : 'calendar-day-cell--normal'}`}
                                style={{
                                    padding: '0.5rem',
                                    cursor: isStaff ? 'pointer' : 'default',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '4px',
                                }}
                            >
                                <div className="calendar-day-header" style={{
                                    fontSize: '0.85rem',
                                    fontWeight: isToday ? 700 : 500,
                                    color: isToday ? 'var(--primary-300)' : 'var(--text-primary)',
                                    marginBottom: '0.25rem',
                                }}>
                                    {day}
                                </div>
                                <div className="calendar-day-events">
                                    {dayEvents.slice(0, 3).map((ev) => (
                                        <div
                                            key={ev.id}
                                            onClick={(e) => handleEventClick(e, ev)}
                                            style={{
                                                fontSize: '0.65rem',
                                                padding: '2px 6px',
                                                borderRadius: '3px',
                                                background: ev.isCancelled
                                                    ? 'rgba(148, 163, 184, 0.08)'
                                                    : `color-mix(in oklab, ${typeColors[ev.type]} 18%, transparent)`,
                                                color: ev.isCancelled ? 'var(--text-tertiary)' : typeColors[ev.type],
                                                whiteSpace: 'nowrap',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis',
                                                borderLeft: `2px solid ${ev.isCancelled ? 'var(--text-tertiary)' : typeColors[ev.type]}`,
                                                zIndex: 10,
                                                textDecoration: ev.isCancelled ? 'line-through' : 'none',
                                                opacity: ev.isCancelled ? 0.7 : 1,
                                            }}
                                        >
                                            {ev.isCancelled ? 'Cancelled: ' : ''}{ev.title}
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div style={{ fontSize: '0.6rem', color: 'var(--text-tertiary)' }}>
                                            +{dayEvents.length - 3} more
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1rem', justifyContent: 'center' }}>
                    {Object.entries(typeColors).map(([type, color]) => (
                        <div key={type} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textTransform: 'capitalize' }}>
                                {type.toLowerCase()}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Event Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">New Event</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)} aria-label="Close"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Event Title</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g., Practice Session"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        required
                                    />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Type</label>
                                        <select
                                            className="form-input form-select"
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                        >
                                            <option value="PRACTICE">Practice</option>
                                            <option value="GAME">Game</option>
                                            <option value="MEETING">Meeting</option>
                                            <option value="OTHER">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Team</label>
                                        <select
                                            className="form-input form-select"
                                            value={formData.teamId}
                                            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                                            required
                                        >
                                            <option value="">Select team</option>
                                            {teams.map((t) => (
                                                <option key={t.id} value={t.id}>{t.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Location</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g., City Sports Complex"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                                {formData.type === 'GAME' && (
                                    <div className="form-group">
                                        <label className="form-label">Opponent</label>
                                        <input
                                            className="form-input"
                                            placeholder="e.g., rival team name"
                                            value={formData.opponentName}
                                            onChange={(e) => setFormData({ ...formData, opponentName: e.target.value })}
                                        />
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Start Time</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            value={formData.startTime}
                                            onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">End Time</label>
                                        <input
                                            type="datetime-local"
                                            className="form-input"
                                            value={formData.endTime}
                                            onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Event'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* RSVP Detail Modal */}
            {selectedEventRsvps && (
                <div className="modal-overlay" onClick={() => setSelectedEventRsvps(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
                        <div className="modal-header" style={{ alignItems: 'flex-start' }}>
                            <div>
                                <h2 className="modal-title" style={{ textDecoration: selectedEventRsvps.isCancelled ? 'line-through' : 'none', opacity: selectedEventRsvps.isCancelled ? 0.7 : 1 }}>
                                    {selectedEventRsvps.title}
                                </h2>
                                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    {new Date(selectedEventRsvps.startTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                    <span className={`badge ${TYPE_BADGE_CLASS[selectedEventRsvps.type] || 'badge-neutral'}`}>
                                        {selectedEventRsvps.type}
                                    </span>
                                    {selectedEventRsvps.isCancelled && (
                                        <span className="badge" style={{ background: 'var(--danger-400)20', color: 'var(--danger-400)' }}>
                                            CANCELLED
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button className="btn btn-ghost btn-icon" onClick={() => setSelectedEventRsvps(null)}>✕</button>
                        </div>
                        <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            {/* Game result display/edit for staff */}
                            {selectedEventRsvps.type === 'GAME' && (
                                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--surface-600)' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {selectedEventRsvps.opponentName ? `vs ${selectedEventRsvps.opponentName}` : 'Game Result'}
                                    </h3>
                                    {isStaff && !selectedEventRsvps.isCancelled ? (
                                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder="Us"
                                                value={selectedEventRsvps.homeScore ?? ''}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                                    setSelectedEventRsvps(prev => prev ? { ...prev, homeScore: val } : null);
                                                }}
                                                style={{ width: '70px', textAlign: 'center' }}
                                            />
                                            <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>—</span>
                                            <input
                                                type="number"
                                                className="form-input"
                                                placeholder="Them"
                                                value={selectedEventRsvps.awayScore ?? ''}
                                                onChange={(e) => {
                                                    const val = e.target.value === '' ? null : Number(e.target.value);
                                                    setSelectedEventRsvps(prev => prev ? { ...prev, awayScore: val } : null);
                                                }}
                                                style={{ width: '70px', textAlign: 'center' }}
                                            />
                                            <select
                                                className="form-input form-select"
                                                value={selectedEventRsvps.result || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value || null;
                                                    setSelectedEventRsvps(prev => prev ? { ...prev, result: val } : null);
                                                }}
                                                style={{ flex: 1 }}
                                            >
                                                <option value="">Result</option>
                                                <option value="WIN">Win</option>
                                                <option value="LOSS">Loss</option>
                                                <option value="DRAW">Draw</option>
                                            </select>
                                            <button
                                                className="btn btn-primary btn-sm"
                                                onClick={async () => {
                                                    try {
                                                        const res = await fetch(`/api/events/${selectedEventRsvps.id}`, {
                                                            method: 'PATCH',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                homeScore: selectedEventRsvps.homeScore,
                                                                awayScore: selectedEventRsvps.awayScore,
                                                                result: selectedEventRsvps.result,
                                                            }),
                                                        });
                                                        if (res.ok) fetchEvents();
                                                    } catch (err) { console.error(err); }
                                                }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    ) : (
                                        <div style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                            {selectedEventRsvps.homeScore !== null && selectedEventRsvps.awayScore !== null ? (
                                                <span style={{ fontWeight: 700 }}>
                                                    {selectedEventRsvps.homeScore} — {selectedEventRsvps.awayScore}
                                                    {selectedEventRsvps.result && (
                                                        <span style={{ marginLeft: '0.5rem', color: selectedEventRsvps.result === 'WIN' ? 'var(--success-400)' : selectedEventRsvps.result === 'LOSS' ? 'var(--danger-400)' : 'var(--text-secondary)' }}>
                                                            ({selectedEventRsvps.result})
                                                        </span>
                                                    )}
                                                </span>
                                            ) : (
                                                <span style={{ color: 'var(--text-tertiary)' }}>Score not recorded</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Staff cancel action */}
                            {isStaff && !selectedEventRsvps.isCancelled && (
                                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--surface-600)' }}>
                                    <button
                                        className="btn btn-danger"
                                        onClick={handleCancelEvent}
                                        style={{ width: '100%' }}
                                    >
                                        Cancel Event
                                    </button>
                                </div>
                            )}

                            {/* User RSVP Controls */}
                            {!isStaff && !selectedEventRsvps.isCancelled && (
                                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--surface-600)' }}>
                                    {isParent && children.length > 0 ? (
                                        <>
                                            <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>RSVP for your child</h3>
                                            {children.length > 1 && (
                                                <select
                                                    className="form-input form-select"
                                                    style={{ marginBottom: '0.75rem', fontSize: '0.85rem' }}
                                                    value={selectedChildId || ''}
                                                    onChange={(e) => setSelectedChildId(e.target.value)}
                                                >
                                                    {children.map((c) => (
                                                        <option key={c.id} value={c.id}>{c.name}</option>
                                                    ))}
                                                </select>
                                            )}
                                            {children.length === 1 && (
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.75rem', fontWeight: 600 }}>
                                                    {children[0].name}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Your RSVP</h3>
                                    )}
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        {['GOING', 'PENDING', 'NOT_GOING'].map((status) => {
                                            const rsvpTargetId = isParent ? selectedChildId : user?.id;
                                            const isSelected = rsvps.find(r => r.userId === rsvpTargetId)?.status === status;
                                            const count = rsvps.filter(r => r.status === status).length;
                                            return (
                                                <button
                                                    key={status}
                                                    onClick={() => handleRsvp(status)}
                                                    style={{
                                                        flex: 1,
                                                        padding: '0.5rem',
                                                        borderRadius: '0.5rem',
                                                        fontSize: '0.8rem',
                                                        fontWeight: 600,
                                                        border: isSelected ? `1px solid ${statusColors[status]}` : '1px solid var(--surface-600)',
                                                        background: isSelected ? `${statusColors[status]}20` : 'var(--surface-700)',
                                                        color: isSelected ? statusColors[status] : 'var(--text-primary)',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                >
                                                    {status === 'NOT_GOING' ? 'Not Going' : status === 'PENDING' ? 'Maybe' : 'Going'} ({count})
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Team RSVPs</h3>
                            {loadingRsvps ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>Loading...</div>
                            ) : rsvps.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No RSVPs yet.</div>
                            ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    {rsvps.map((rsvp) => (
                                        <div key={rsvp.id} className="glass-subtle" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
                                            <div className="avatar avatar-sm" style={{ background: getAvatarColor(rsvp.userName) }}>
                                                {getInitials(rsvp.userName)}
                                            </div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{rsvp.userName}</div>
                                                {rsvp.note && <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>&quot;{rsvp.note}&quot;</div>}
                                            </div>
                                            <div style={{
                                                fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '1rem',
                                                color: statusColors[rsvp.status] || 'var(--text-secondary)',
                                                background: `${statusColors[rsvp.status] || 'var(--surface-600)'}20`,
                                            }}>
                                                {rsvp.status.replace('_', ' ')}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
