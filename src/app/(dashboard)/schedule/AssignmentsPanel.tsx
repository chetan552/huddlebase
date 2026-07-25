'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { Plus, Trash2, Check, XCircle, Shuffle, X } from 'lucide-react';

interface Assignment {
    id: string;
    role: string;
    roleLabel: string;
    label: string | null;
    notes: string | null;
    status: string;
    autoAssigned: boolean;
    userId: string | null;
    userName: string | null;
    isMine: boolean;
}

interface Member {
    userId: string;
    name: string;
    role: string;
}

const ROLES = [
    { value: 'SCOREKEEPER', label: 'Scorekeeper' },
    { value: 'REFEREE', label: 'Referee' },
    { value: 'FIELD_SETUP', label: 'Field setup' },
    { value: 'FIELD_TEARDOWN', label: 'Field teardown' },
    { value: 'CONCESSIONS', label: 'Concessions' },
    { value: 'TEAM_PARENT', label: 'Team parent' },
    { value: 'PHOTOGRAPHER', label: 'Photographer' },
    { value: 'TRANSPORT', label: 'Transport' },
    { value: 'OTHER', label: 'Other' },
];

const STATUS_COLOR: Record<string, string> = {
    ASSIGNED: '#f59e0b',
    ACCEPTED: '#10b981',
    DECLINED: '#ef4444',
};

/**
 * Duty roster for one event — scorekeeper, referee, setup and so on.
 *
 * Separate from the snack sign-up sheet: assignments are given to a named person
 * rather than claimed, and staff can spread them across a season automatically.
 */
export default function AssignmentsPanel({
    eventId, teamId, isStaff,
}: {
    eventId: string;
    teamId: string;
    isStaff: boolean;
}) {
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [loading, setLoading] = useState(true);
    const [adding, setAdding] = useState(false);
    const [showRotate, setShowRotate] = useState(false);
    const [newRole, setNewRole] = useState('SCOREKEEPER');
    const [newLabel, setNewLabel] = useState('');
    const [newUserId, setNewUserId] = useState('');
    const [error, setError] = useState('');

    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/events/${eventId}/assignments`);
            const data = await res.json();
            if (data.success) setAssignments(data.data);
        } catch { /* empty state covers it */ }
        setLoading(false);
    }, [eventId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (!isStaff) return;
        (async () => {
            try {
                const res = await fetch(`/api/roster?teamId=${teamId}`);
                const data = await res.json();
                if (data.success) {
                    setMembers(data.data.map((m: { userId?: string; id: string; name: string; role: string }) => ({
                        userId: m.userId ?? m.id, name: m.name, role: m.role,
                    })));
                }
            } catch { /* the picker just stays empty */ }
        })();
    }, [teamId, isStaff]);

    const add = async () => {
        if (newRole === 'OTHER' && !newLabel.trim()) {
            setError('Give the duty a name.');
            return;
        }
        setAdding(true);
        setError('');
        try {
            const res = await fetch(`/api/events/${eventId}/assignments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole, userId: newUserId || null, label: newLabel || null }),
            });
            const data = await res.json();
            if (data.success) {
                setNewLabel('');
                setNewUserId('');
                load();
            } else {
                setError(data.error || 'Could not add that duty.');
            }
        } catch {
            setError('Something went wrong. Try again.');
        }
        setAdding(false);
    };

    const respond = async (assignment: Assignment, status: string) => {
        setAssignments((prev) => prev.map((a) => (a.id === assignment.id ? { ...a, status } : a)));
        try {
            await fetch(`/api/assignments/${assignment.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            load();
        } catch { load(); }
    };

    const remove = async (assignment: Assignment) => {
        setAssignments((prev) => prev.filter((a) => a.id !== assignment.id));
        try {
            await fetch(`/api/assignments/${assignment.id}`, { method: 'DELETE' });
        } catch { load(); }
    };

    if (loading) return <div className="skeleton" style={{ height: 60 }} />;

    return (
        <div>
            {error && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

            {assignments.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>
                    No duties assigned for this event yet.
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '1rem' }}>
                    {assignments.map((a) => (
                        <div key={a.id} style={{
                            display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.55rem 0.65rem',
                            borderRadius: 'var(--radius-md)', background: 'rgba(148,163,184,0.05)',
                        }}>
                            {a.userName ? (
                                <div className="avatar avatar-sm" style={{ background: getAvatarColor(a.userName) }}>
                                    {getInitials(a.userName)}
                                </div>
                            ) : (
                                <div style={{
                                    width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                                    border: '1px dashed rgba(148,163,184,0.4)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '0.65rem', color: 'var(--text-tertiary)',
                                }}>
                                    ?
                                </div>
                            )}

                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{a.roleLabel}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                    {a.userName ?? 'Unassigned'}
                                    {a.autoAssigned && a.userName ? ' · from rotation' : ''}
                                </div>
                            </div>

                            <span style={{
                                fontSize: '0.68rem', fontWeight: 600, padding: '0.15rem 0.45rem', borderRadius: 10,
                                background: `${STATUS_COLOR[a.status] ?? '#64748b'}22`,
                                color: STATUS_COLOR[a.status] ?? 'var(--text-secondary)',
                            }}>
                                {a.status}
                            </span>

                            {/* The assignee answers for themselves. */}
                            {a.isMine && a.status !== 'ACCEPTED' && (
                                <button className="btn btn-ghost btn-sm" onClick={() => respond(a, 'ACCEPTED')} aria-label="Accept duty">
                                    <Check size={14} color="var(--success-400)" />
                                </button>
                            )}
                            {a.isMine && a.status !== 'DECLINED' && (
                                <button className="btn btn-ghost btn-sm" onClick={() => respond(a, 'DECLINED')} aria-label="Decline duty">
                                    <XCircle size={14} color="var(--danger-400)" />
                                </button>
                            )}
                            {isStaff && (
                                <button className="btn btn-ghost btn-sm" onClick={() => remove(a)} aria-label="Remove duty">
                                    <Trash2 size={14} />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {isStaff && (
                <>
                    <div style={{
                        padding: '0.75rem', borderRadius: 'var(--radius-md)',
                        background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.1)',
                    }}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                            <div className="form-group" style={{ margin: 0, flex: '1 1 130px' }}>
                                <label className="form-label" style={{ fontSize: '0.72rem' }}>Duty</label>
                                <select className="form-input form-select" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group" style={{ margin: 0, flex: '1 1 130px' }}>
                                <label className="form-label" style={{ fontSize: '0.72rem' }}>Who</label>
                                <select className="form-input form-select" value={newUserId} onChange={(e) => setNewUserId(e.target.value)}>
                                    <option value="">Leave open</option>
                                    {members.map((m) => <option key={m.userId} value={m.userId}>{m.name}</option>)}
                                </select>
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={add} disabled={adding}>
                                <Plus size={14} /> Add
                            </button>
                        </div>

                        {newRole === 'OTHER' && (
                            <input
                                className="form-input"
                                placeholder="Name this duty"
                                value={newLabel}
                                onChange={(e) => setNewLabel(e.target.value)}
                                style={{ marginTop: '0.5rem', fontSize: '0.82rem' }}
                            />
                        )}
                    </div>

                    <button className="btn btn-ghost btn-sm" onClick={() => setShowRotate(true)} style={{ marginTop: '0.65rem' }}>
                        <Shuffle size={14} /> Auto-assign across the season
                    </button>
                </>
            )}

            {showRotate && (
                <RotationForm
                    teamId={teamId}
                    onClose={() => setShowRotate(false)}
                    onDone={() => { setShowRotate(false); load(); }}
                />
            )}
        </div>
    );
}

function RotationForm({ teamId, onClose, onDone }: { teamId: string; onClose: () => void; onDone: () => void }) {
    const [role, setRole] = useState('SCOREKEEPER');
    const [eventType, setEventType] = useState('GAME');
    const [to, setTo] = useState('');
    const [notify, setNotify] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{
        created: number;
        eventsCovered: number;
        skipped: number;
        distribution: { name: string; assigned: number; previous: number }[];
    } | null>(null);

    const run = async () => {
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/assignments/rotate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId, role, eventType: eventType || null, to: to || null, notify }),
            });
            const data = await res.json();
            if (data.success) setResult(data.data);
            else setError(data.error || 'Could not run the rotation.');
        } catch {
            setError('Something went wrong. Try again.');
        }
        setBusy(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440 }}>
                <div className="modal-header">
                    <h3 className="modal-title">Auto-assign duty</h3>
                    <button onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close"><X size={16} /></button>
                </div>
                <div className="modal-body">
                    {error && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

                    {result ? (
                        <>
                            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                                Assigned {result.created} duties across {result.eventsCovered} events.
                                {result.skipped > 0 && ` ${result.skipped} event${result.skipped === 1 ? ' was' : 's were'} left alone (already assigned or accepted).`}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {result.distribution.map((d) => (
                                    <div key={d.name} style={{
                                        display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem',
                                        padding: '0.4rem 0.55rem', borderRadius: 'var(--radius-md)',
                                        background: 'rgba(148,163,184,0.05)',
                                    }}>
                                        <span>{d.name}</span>
                                        <span style={{ color: 'var(--text-tertiary)' }}>
                                            +{d.assigned}{d.previous > 0 ? ` (had ${d.previous})` : ''}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="form-group">
                                <label className="form-label">Duty</label>
                                <select className="form-select" value={role} onChange={(e) => setRole(e.target.value)}>
                                    {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Apply to</label>
                                <select className="form-select" value={eventType} onChange={(e) => setEventType(e.target.value)}>
                                    <option value="GAME">Games only</option>
                                    <option value="PRACTICE">Practices only</option>
                                    <option value="">All upcoming events</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Through <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                                <input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} />
                            </div>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                                Notify everyone assigned
                            </label>
                            <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.65rem' }}>
                                Turns are spread evenly between parents, coaches and managers, counting duties they already
                                hold. Anything you assigned by hand, or that someone has accepted, is left untouched.
                            </p>
                        </>
                    )}
                </div>
                <div className="modal-footer">
                    {result ? (
                        <button className="btn btn-primary" onClick={onDone}>Done</button>
                    ) : (
                        <>
                            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                            <button className="btn btn-primary" onClick={run} disabled={busy}>
                                {busy ? 'Assigning…' : 'Run rotation'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
