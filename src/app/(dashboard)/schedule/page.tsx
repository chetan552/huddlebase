'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Cookie, CupSoda, Package, Plus, Trash2, X } from 'lucide-react';

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

interface VolunteerSignup {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string | null;
    note: string | null;
    createdAt: string;
}

interface VolunteerNeed {
    id: string;
    type: 'SNACKS' | 'DRINKS' | 'OTHER';
    title: string;
    description: string | null;
    slotsNeeded: number;
    signups: VolunteerSignup[];
}

interface VolunteerNeedDraft {
    id?: string;
    type: 'SNACKS' | 'DRINKS' | 'OTHER';
    title: string;
    description: string;
    slotsNeeded: number;
}

interface FamilyChild {
    id: string;
    name: string;
}

interface RsvpRequestBody {
    status: string;
    userId?: string;
}

const emptyVolunteerNeed = (): VolunteerNeedDraft => ({
    type: 'SNACKS',
    title: '',
    description: '',
    slotsNeeded: 1,
});

const volunteerTypeMeta = {
    SNACKS: { label: 'Snacks', icon: Cookie, color: 'var(--warning-400)' },
    DRINKS: { label: 'Drinks', icon: CupSoda, color: 'var(--primary-400)' },
    OTHER: { label: 'Other', icon: Package, color: 'var(--accent-400)' },
};

export default function SchedulePage() {
    const { user } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<Event[]>([]);
    const [showModal, setShowModal] = useState(false);
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
    const [attendance, setAttendance] = useState<Array<{
        userId: string;
        userName: string;
        userAvatar: string | null;
        present: boolean | null;
        lateReason: string | null;
    }>>([]);
    const [attendanceSaving, setAttendanceSaving] = useState(false);
    const [eventModalTab, setEventModalTab] = useState<'rsvps' | 'attendance' | 'volunteers'>('rsvps');
    const [volunteerNeeds, setVolunteerNeeds] = useState<VolunteerNeed[]>([]);
    const [volunteerDrafts, setVolunteerDrafts] = useState<VolunteerNeedDraft[]>([]);
    const [loadingVolunteers, setLoadingVolunteers] = useState(false);
    const [volunteersSaving, setVolunteersSaving] = useState(false);
    const [volunteerError, setVolunteerError] = useState<string | null>(null);
    const [volunteerSuccess, setVolunteerSuccess] = useState<string | null>(null);
    const [volunteerMigrationRequired, setVolunteerMigrationRequired] = useState(false);
    const searchParams = useSearchParams();
    const isStaff = user?.role === 'ADMIN' || (user?.role === 'COACH' && user.coachApproved);
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
                    setChildren(data.data.map((c: FamilyChild) => ({ id: c.id, name: c.name })));
                    setSelectedChildId(data.data[0].id);
                }
            }).catch(console.error);
        }
    }, [isParent]);

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

    const fetchAttendance = async (eventId: string) => {
        try {
            const res = await fetch(`/api/events/${eventId}/attendance`);
            const data = await res.json();
            if (data.success) setAttendance(data.data);
        } catch (err) { console.error('Failed to fetch attendance:', err); }
    };

    const fetchVolunteers = async (eventId: string) => {
        setLoadingVolunteers(true);
        setVolunteerError(null);
        setVolunteerMigrationRequired(false);
        try {
            const res = await fetch(`/api/events/${eventId}/volunteers`);
            const data = await res.json();
            if (data.success) {
                setVolunteerMigrationRequired(Boolean(data.migrationRequired));
                setVolunteerNeeds(data.data);
                setVolunteerDrafts(data.data.map((need: VolunteerNeed) => ({
                    id: need.id,
                    type: need.type,
                    title: need.title,
                    description: need.description || '',
                    slotsNeeded: need.slotsNeeded,
                })));
            }
        } catch (err) {
            console.error('Failed to fetch volunteers:', err);
            setVolunteerError('Could not load snack and drink signups.');
        }
        setLoadingVolunteers(false);
    };

    const saveAttendance = async () => {
        if (!selectedEventRsvps) return;
        setAttendanceSaving(true);
        try {
            const res = await fetch(`/api/events/${selectedEventRsvps.id}/attendance`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    records: attendance.map((a) => ({
                        userId: a.userId,
                        present: a.present === true,
                        lateReason: a.lateReason,
                    })),
                }),
            });
            if (res.ok) fetchAttendance(selectedEventRsvps.id);
        } catch (err) { console.error('Failed to save attendance:', err); }
        setAttendanceSaving(false);
    };

    const handleEventClick = (e: React.MouseEvent, ev: Event) => {
        e.stopPropagation();
        setSelectedEventRsvps(ev);
        setEventModalTab('rsvps');
        setVolunteerSuccess(null);
        fetchRsvps(ev.id);
        fetchVolunteers(ev.id);
        if (isStaff) fetchAttendance(ev.id);
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
        const body: RsvpRequestBody = { status };
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

    const handleVolunteerSignup = async (need: VolunteerNeed, signedUp: boolean) => {
        if (!selectedEventRsvps) return;
        if (volunteerMigrationRequired) {
            setVolunteerError('Snack and drink signups need a database migration before they can be saved.');
            return;
        }
        setVolunteerError(null);
        try {
            const res = await fetch(`/api/events/${selectedEventRsvps.id}/volunteers/${need.id}/signup`, {
                method: signedUp ? 'DELETE' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: signedUp ? undefined : JSON.stringify({}),
            });
            const data = await res.json();
            if (!data.success) {
                setVolunteerError(data.error || 'Could not update signup.');
                return;
            }
            fetchVolunteers(selectedEventRsvps.id);
        } catch (err) {
            console.error('Failed to update volunteer signup:', err);
            setVolunteerError('Could not update signup.');
        }
    };

    const saveVolunteerNeeds = async () => {
        if (!selectedEventRsvps) return;
        if (volunteerMigrationRequired) {
            setVolunteerError('Snack and drink signups need a database migration before they can be saved.');
            return;
        }
        setVolunteersSaving(true);
        setVolunteerError(null);
        setVolunteerSuccess(null);
        try {
            const res = await fetch(`/api/events/${selectedEventRsvps.id}/volunteers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ needs: volunteerDrafts }),
            });
            const data = await res.json();
            if (!data.success) {
                setVolunteerError(data.error || 'Could not save volunteer needs.');
                return;
            }
            await fetchVolunteers(selectedEventRsvps.id);
            setVolunteerSuccess('Snack and drink signups saved.');
        } catch (err) {
            console.error('Failed to save volunteer needs:', err);
            setVolunteerError('Could not save volunteer needs.');
        } finally {
            setVolunteersSaving(false);
        }
    };

    useEffect(() => {
        const eventId = searchParams?.get('eventId');
        if (eventId && events.length > 0) {
            const evt = events.find(e => e.id === eventId);
            if (evt) {
                setSelectedEventRsvps(evt);
                setVolunteerSuccess(null);
                fetchRsvps(evt.id);
                fetchVolunteers(evt.id);
                if (isStaff) fetchAttendance(evt.id);
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
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
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

                            {/* Parent snack and drink signup controls */}
                            {!isStaff && !selectedEventRsvps.isCancelled && (
                                <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--surface-600)' }}>
                                    <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>Snacks & Drinks</h3>
                                    {volunteerError && (
                                        <div style={{ marginBottom: '0.75rem', color: 'var(--danger-400)', fontSize: '0.8rem' }}>
                                            {volunteerError}
                                        </div>
                                    )}
                                    {volunteerMigrationRequired && (
                                        <div style={{ marginBottom: '0.75rem', color: 'var(--warning-400)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                                            Snack and drink signups are not available until the database migration is applied.
                                        </div>
                                    )}
                                    {loadingVolunteers ? (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading...</div>
                                    ) : volunteerNeeds.length === 0 ? (
                                        <div style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem' }}>No snack or drink signups requested for this event.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {volunteerNeeds.map((need) => {
                                                const meta = volunteerTypeMeta[need.type] || volunteerTypeMeta.OTHER;
                                                const Icon = meta.icon;
                                                const signedUp = need.signups.some((signup) => signup.userId === user?.id);
                                                const isFull = need.signups.length >= need.slotsNeeded && !signedUp;

                                                return (
                                                    <div key={need.id} className="glass-subtle" style={{ padding: '0.75rem', display: 'grid', gap: '0.75rem' }}>
                                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                                                            <div style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', color: meta.color, background: `${meta.color}18`, flexShrink: 0 }}>
                                                                <Icon size={17} />
                                                            </div>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{need.title}</div>
                                                                <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 2 }}>
                                                                    {need.signups.length} of {need.slotsNeeded} claimed
                                                                </div>
                                                                {need.description && (
                                                                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.35rem' }}>{need.description}</div>
                                                                )}
                                                            </div>
                                                            <button
                                                                className={`btn ${signedUp ? 'btn-outline' : 'btn-primary'} btn-sm`}
                                                                onClick={() => handleVolunteerSignup(need, signedUp)}
                                                                disabled={isFull || volunteerMigrationRequired}
                                                                style={{ flexShrink: 0 }}
                                                            >
                                                                {signedUp ? 'Cancel' : isFull ? 'Full' : 'Sign up'}
                                                            </button>
                                                        </div>
                                                        {need.signups.length > 0 && (
                                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                                                                {need.signups.map((signup) => (
                                                                    <span key={signup.id} className="badge" style={{ background: 'var(--surface-700)', color: 'var(--text-secondary)', border: '1px solid var(--surface-600)' }}>
                                                                        {signup.userName}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Tabs */}
                            {isStaff && !selectedEventRsvps.isCancelled && (
                                <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: '1px solid var(--surface-600)' }}>
                                    {(['rsvps', 'attendance', 'volunteers'] as const).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setEventModalTab(tab)}
                                            style={{
                                                padding: '0.5rem 0.875rem',
                                                fontSize: '0.85rem',
                                                fontWeight: 600,
                                                border: 'none',
                                                background: 'transparent',
                                                color: eventModalTab === tab ? 'var(--primary-400)' : 'var(--text-secondary)',
                                                borderBottom: eventModalTab === tab ? '2px solid var(--primary-400)' : '2px solid transparent',
                                                cursor: 'pointer',
                                                marginBottom: '-1px',
                                                textTransform: 'capitalize',
                                            }}
                                        >
                                            {tab === 'volunteers' ? 'Snacks' : tab}
                                        </button>
                                    ))}
                                </div>
                            )}

                            {/* RSVPs tab */}
                            {(eventModalTab === 'rsvps' || !isStaff || selectedEventRsvps.isCancelled) && (
                                <>
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
                                </>
                            )}

                            {/* Attendance tab */}
                            {isStaff && eventModalTab === 'attendance' && !selectedEventRsvps.isCancelled && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Attendance</h3>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={saveAttendance}
                                            disabled={attendanceSaving}
                                        >
                                            {attendanceSaving ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                    {attendance.length === 0 ? (
                                        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>No team members found.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                            {attendance.map((att) => (
                                                <div key={att.userId} className="glass-subtle" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem' }}>
                                                    <div className="avatar avatar-sm" style={{ background: getAvatarColor(att.userName) }}>
                                                        {getInitials(att.userName)}
                                                    </div>
                                                    <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: '0.9rem' }}>
                                                        {att.userName}
                                                    </div>
                                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                                        {[
                                                            { key: true, label: 'Present', color: 'var(--success-400)' },
                                                            { key: false, label: 'Absent', color: 'var(--danger-400)' },
                                                        ].map((opt) => (
                                                            <button
                                                                key={String(opt.key)}
                                                                onClick={() => {
                                                                    setAttendance((prev) =>
                                                                        prev.map((a) =>
                                                                            a.userId === att.userId ? { ...a, present: opt.key } : a
                                                                        )
                                                                    );
                                                                }}
                                                                style={{
                                                                    padding: '0.375rem 0.625rem',
                                                                    borderRadius: '0.375rem',
                                                                    fontSize: '0.75rem',
                                                                    fontWeight: 600,
                                                                    border: '1px solid var(--surface-600)',
                                                                    background: att.present === opt.key ? `${opt.color}20` : 'var(--surface-700)',
                                                                    color: att.present === opt.key ? opt.color : 'var(--text-primary)',
                                                                    cursor: 'pointer',
                                                                }}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Volunteers tab */}
                            {isStaff && eventModalTab === 'volunteers' && !selectedEventRsvps.isCancelled && (
                                <>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                                        <div>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Snacks & Drinks</h3>
                                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>
                                                Add items parents can claim for this event.
                                            </div>
                                        </div>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={saveVolunteerNeeds}
                                            disabled={volunteersSaving || volunteerMigrationRequired}
                                        >
                                            {volunteersSaving ? 'Saving...' : 'Save Signups'}
                                        </button>
                                    </div>

                                    {volunteerError && (
                                        <div style={{ marginBottom: '0.75rem', color: 'var(--danger-400)', fontSize: '0.8rem' }}>
                                            {volunteerError}
                                        </div>
                                    )}
                                    {volunteerSuccess && (
                                        <div style={{ marginBottom: '0.75rem', color: 'var(--success-400)', fontSize: '0.8rem' }}>
                                            {volunteerSuccess}
                                        </div>
                                    )}
                                    {volunteerMigrationRequired && (
                                        <div style={{ marginBottom: '0.75rem', color: 'var(--warning-400)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                                            Snack and drink signups are installed in the app, but the database migration has not been applied yet.
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                        {volunteerDrafts.map((need, index) => {
                                            const existing = need.id ? volunteerNeeds.find((current) => current.id === need.id) : null;

                                            return (
                                                <div key={need.id || `new-${index}`} className="glass-subtle" style={{ padding: '0.75rem', display: 'grid', gap: '0.75rem' }}>
                                                    <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr 72px 34px', gap: '0.5rem', alignItems: 'center' }}>
                                                        <select
                                                            className="form-input form-select"
                                                            value={need.type}
                                                            onChange={(e) => setVolunteerDrafts((prev) => prev.map((item, i) => i === index ? { ...item, type: e.target.value as VolunteerNeedDraft['type'] } : item))}
                                                            disabled={volunteerMigrationRequired}
                                                            style={{ fontSize: '0.82rem' }}
                                                        >
                                                            <option value="SNACKS">Snacks</option>
                                                            <option value="DRINKS">Drinks</option>
                                                            <option value="OTHER">Other</option>
                                                        </select>
                                                        <input
                                                            className="form-input"
                                                            placeholder="Water bottles, fruit, post-game snacks"
                                                            value={need.title}
                                                            onChange={(e) => setVolunteerDrafts((prev) => prev.map((item, i) => i === index ? { ...item, title: e.target.value } : item))}
                                                            disabled={volunteerMigrationRequired}
                                                            style={{ fontSize: '0.82rem' }}
                                                        />
                                                        <input
                                                            type="number"
                                                            min={1}
                                                            max={20}
                                                            className="form-input"
                                                            value={need.slotsNeeded}
                                                            onChange={(e) => setVolunteerDrafts((prev) => prev.map((item, i) => i === index ? { ...item, slotsNeeded: Number(e.target.value) || 1 } : item))}
                                                            aria-label="Slots needed"
                                                            disabled={volunteerMigrationRequired}
                                                            style={{ fontSize: '0.82rem' }}
                                                        />
                                                        <button
                                                            className="btn btn-ghost btn-icon"
                                                            onClick={() => setVolunteerDrafts((prev) => prev.filter((_, i) => i !== index))}
                                                            aria-label="Remove volunteer need"
                                                            disabled={volunteerMigrationRequired}
                                                            style={{ width: 34, height: 34, color: 'var(--danger-400)' }}
                                                        >
                                                            <Trash2 size={15} />
                                                        </button>
                                                    </div>
                                                    <input
                                                        className="form-input"
                                                        placeholder="Optional note for parents"
                                                        value={need.description}
                                                        onChange={(e) => setVolunteerDrafts((prev) => prev.map((item, i) => i === index ? { ...item, description: e.target.value } : item))}
                                                        disabled={volunteerMigrationRequired}
                                                        style={{ fontSize: '0.82rem' }}
                                                    />
                                                    {existing && existing.signups.length > 0 && (
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                                                                {existing.signups.length} signed up:
                                                            </span>
                                                            {existing.signups.map((signup) => (
                                                                <span key={signup.id} className="badge" style={{ background: 'var(--surface-700)', color: 'var(--text-secondary)', border: '1px solid var(--surface-600)' }}>
                                                                    {signup.userName}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <button
                                        className="btn btn-outline"
                                        onClick={() => setVolunteerDrafts((prev) => [...prev, emptyVolunteerNeed()])}
                                        disabled={volunteerMigrationRequired}
                                        style={{ width: '100%', justifyContent: 'center', marginTop: '0.75rem', gap: '0.4rem' }}
                                    >
                                        <Plus size={15} /> Add snack or drink
                                    </button>

                                    {loadingVolunteers && (
                                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading...</div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
