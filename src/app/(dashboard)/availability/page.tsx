'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { CalendarClock, Plus, Trash2, X, Plane, AlertCircle, Check } from 'lucide-react';

interface AvailabilityBlock {
    id: string;
    userId: string;
    userName: string;
    teamId: string | null;
    teamName: string | null;
    startDate: string;
    endDate: string;
    status: 'UNAVAILABLE' | 'LIMITED' | 'AVAILABLE';
    reason: string | null;
}

interface Team { id: string; name: string }
interface Child { id: string; name: string }

const STATUS_META: Record<string, { label: string; hint: string; color: string; icon: React.ReactNode }> = {
    UNAVAILABLE: { label: 'Away', hint: 'RSVPs set to Not going', color: '#ef4444', icon: <Plane size={14} /> },
    LIMITED: { label: 'Maybe', hint: 'RSVPs set to Maybe', color: '#f59e0b', icon: <AlertCircle size={14} /> },
    AVAILABLE: { label: 'Available', hint: 'RSVPs set to Going', color: '#10b981', icon: <Check size={14} /> },
};

function formatRange(startIso: string, endIso: string): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    const start = new Date(startIso);
    const end = new Date(endIso);
    const sameYear = start.getUTCFullYear() === end.getUTCFullYear();
    const startLabel = start.toLocaleDateString('en-US', opts);
    const endLabel = end.toLocaleDateString('en-US', { ...opts, year: sameYear ? undefined : 'numeric' });
    return startLabel === endLabel ? startLabel : `${startLabel} – ${endLabel}`;
}

export default function AvailabilityPage() {
    const { user } = useAuth();
    const [blocks, setBlocks] = useState<AvailabilityBlock[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [familyMembers, setFamilyMembers] = useState<Child[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [notice, setNotice] = useState('');

    const load = useCallback(async () => {
        try {
            const [blocksRes, teamsRes, familyRes] = await Promise.all([
                fetch('/api/availability'),
                fetch('/api/teams'),
                fetch('/api/family'),
            ]);
            const blocksData = await blocksRes.json();
            const teamsData = await teamsRes.json();
            const familyData = await familyRes.json();
            if (blocksData.success) setBlocks(blocksData.data);
            if (teamsData.success) setTeams(teamsData.data);
            if (familyData.success) setFamilyMembers(familyData.data);
        } catch { /* surfaced by the empty state */ }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const remove = async (id: string) => {
        setBlocks((prev) => prev.filter((b) => b.id !== id));
        try {
            const res = await fetch(`/api/availability/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success && data.meta?.rsvpsCleared > 0) {
                setNotice(`Reset ${data.meta.rsvpsCleared} RSVP${data.meta.rsvpsCleared === 1 ? '' : 's'} back to no answer.`);
            }
        } catch {
            load(); // put it back if the delete failed
        }
    };

    const upcoming = blocks.filter((b) => new Date(b.endDate) >= new Date());
    const past = blocks.filter((b) => new Date(b.endDate) < new Date());

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Availability</h1>
                    <p className="page-subtitle">
                        Mark the dates you&apos;re away once, and every event in that range is answered for you.
                    </p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowForm(true)}>
                    <Plus size={16} /> Add dates
                </button>
            </div>

            {notice && (
                <div className="form-success" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>{notice}</span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setNotice('')} aria-label="Dismiss"><X size={14} /></button>
                </div>
            )}

            {loading ? (
                <div className="card"><div className="skeleton" style={{ height: 80 }} /></div>
            ) : blocks.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon"><CalendarClock /></div>
                    <h3 className="empty-state__title">No dates blocked</h3>
                    <p className="empty-state__description">
                        Going on vacation or missing a stretch of the season? Add the dates and your coach will see it
                        on every affected event.
                    </p>
                    <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowForm(true)}>
                        <Plus size={16} /> Add dates
                    </button>
                </div>
            ) : (
                <>
                    <BlockList title="Upcoming" blocks={upcoming} currentUserId={user?.id} onRemove={remove} />
                    {past.length > 0 && <BlockList title="Past" blocks={past} currentUserId={user?.id} onRemove={remove} dimmed />}
                </>
            )}

            {showForm && (
                <AvailabilityForm
                    teams={teams}
                    familyMembers={familyMembers}
                    onClose={() => setShowForm(false)}
                    onSaved={(rsvpsUpdated) => {
                        setShowForm(false);
                        if (rsvpsUpdated > 0) {
                            setNotice(`Updated ${rsvpsUpdated} RSVP${rsvpsUpdated === 1 ? '' : 's'} automatically.`);
                        }
                        load();
                    }}
                />
            )}
        </div>
    );
}

function BlockList({
    title, blocks, currentUserId, onRemove, dimmed,
}: {
    title: string;
    blocks: AvailabilityBlock[];
    currentUserId?: string;
    onRemove: (id: string) => void;
    dimmed?: boolean;
}) {
    if (blocks.length === 0) return null;

    return (
        <div className="card" style={{ marginBottom: '1.25rem', opacity: dimmed ? 0.6 : 1 }}>
            <div className="card-header">
                <h2 className="card-title">{title}</h2>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {blocks.map((b) => {
                    const meta = STATUS_META[b.status] ?? STATUS_META.UNAVAILABLE;
                    return (
                        <div
                            key={b.id}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.75rem',
                                borderRadius: 'var(--radius-md)', background: 'rgba(148,163,184,0.05)',
                                border: '1px solid rgba(148,163,184,0.08)',
                            }}
                        >
                            <div className="avatar avatar-sm" style={{ background: getAvatarColor(b.userName) }}>
                                {getInitials(b.userName)}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                    {formatRange(b.startDate, b.endDate)}
                                    <span style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
                                        padding: '0.1rem 0.45rem', borderRadius: 10, fontSize: '0.68rem', fontWeight: 600,
                                        background: `${meta.color}22`, color: meta.color,
                                    }}>
                                        {meta.icon} {meta.label}
                                    </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                                    {b.userId !== currentUserId && `${b.userName} · `}
                                    {b.teamName ?? 'All teams'}
                                    {b.reason ? ` · ${b.reason}` : ''}
                                </div>
                            </div>
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => onRemove(b.id)}
                                aria-label="Remove these dates"
                                title="Remove"
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function AvailabilityForm({
    teams, familyMembers, onClose, onSaved,
}: {
    teams: Team[];
    familyMembers: Child[];
    onClose: () => void;
    onSaved: (rsvpsUpdated: number) => void;
}) {
    const today = new Date().toISOString().slice(0, 10);
    const [form, setForm] = useState({
        userId: '',
        teamId: '',
        startDate: today,
        endDate: today,
        status: 'UNAVAILABLE',
        reason: '',
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (form.endDate < form.startDate) {
            setError('The end date needs to be on or after the start date.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    userId: form.userId || undefined,
                    teamId: form.teamId || undefined,
                }),
            });
            const data = await res.json();
            if (data.success) onSaved(data.meta?.rsvpsUpdated ?? 0);
            else setError(data.error || 'Could not save those dates.');
        } catch {
            setError('Something went wrong. Try again.');
        }
        setBusy(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 480 }}>
                <div className="modal-header">
                    <h3 className="modal-title">Block out dates</h3>
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close"><X size={16} /></button>
                </div>
                <div className="modal-body">
                    {error && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

                    {familyMembers.length > 0 && (
                        <div className="form-group">
                            <label className="form-label">Who</label>
                            <select className="form-select" value={form.userId} onChange={(e) => setForm({ ...form, userId: e.target.value })}>
                                <option value="">Me</option>
                                {familyMembers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="modal-form-row">
                        <div className="form-group">
                            <label className="form-label">From</label>
                            <input type="date" className="form-input" required value={form.startDate}
                                onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">To</label>
                            <input type="date" className="form-input" required value={form.endDate} min={form.startDate}
                                onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Status</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {(['UNAVAILABLE', 'LIMITED', 'AVAILABLE'] as const).map((status) => {
                                const meta = STATUS_META[status];
                                const selected = form.status === status;
                                return (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() => setForm({ ...form, status })}
                                        style={{
                                            flex: 1, padding: '0.6rem 0.4rem', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                            background: selected ? `${meta.color}22` : 'rgba(148,163,184,0.06)',
                                            border: `1px solid ${selected ? meta.color : 'transparent'}`,
                                            color: selected ? meta.color : 'var(--text-secondary)',
                                            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem',
                                            fontSize: '0.78rem', fontWeight: 600,
                                        }}
                                    >
                                        {meta.icon}
                                        {meta.label}
                                    </button>
                                );
                            })}
                        </div>
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.4rem' }}>
                            {STATUS_META[form.status].hint}. Answers you&apos;ve already given by hand are left alone.
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Team</label>
                        <select className="form-select" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}>
                            <option value="">All teams</option>
                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Reason <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                        <input className="form-input" placeholder="e.g. Family vacation" value={form.reason}
                            onChange={(e) => setForm({ ...form, reason: e.target.value })} />
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy}>
                        {busy ? 'Saving…' : 'Save dates'}
                    </button>
                </div>
            </form>
        </div>
    );
}
