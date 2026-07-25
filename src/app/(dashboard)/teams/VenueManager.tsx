'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, Plus, Trash2, X, Navigation, Star } from 'lucide-react';

interface Venue {
    id: string;
    teamId: string;
    name: string;
    address: string | null;
    city: string | null;
    region: string | null;
    postalCode: string | null;
    latitude: number | null;
    longitude: number | null;
    notes: string | null;
    isDefault: boolean;
    formattedAddress: string;
    directionsUrl: string | null;
    eventCount: number;
}

interface Team { id: string; name: string }

/**
 * Saved venue library.
 *
 * Lets a coach enter a field address once a season instead of retyping it on every
 * event, and gives families a directions link that resolves to the right pitch.
 */
export default function VenueManager({ teams }: { teams: Team[] }) {
    const [venues, setVenues] = useState<Venue[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/venues');
            const data = await res.json();
            if (data.success) setVenues(data.data);
        } catch { /* empty state covers it */ }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const remove = async (venue: Venue) => {
        setVenues((prev) => prev.filter((v) => v.id !== venue.id));
        try {
            await fetch(`/api/venues/${venue.id}`, { method: 'DELETE' });
            load();
        } catch { load(); }
    };

    if (loading || teams.length === 0) return null;

    const teamName = (id: string) => teams.find((t) => t.id === id)?.name ?? '';

    return (
        <div className="card" style={{ marginTop: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                    <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                        <MapPin size={18} color="var(--primary-400)" /> Saved venues
                    </h2>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                        Reuse field addresses across events, with directions for every family.
                    </p>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(true)}>
                    <Plus size={14} /> Add venue
                </button>
            </div>

            {venues.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)' }}>
                    No venues saved yet. Add your home field to stop retyping the address.
                </p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {venues.map((v) => (
                        <div key={v.id} style={{
                            display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.7rem',
                            borderRadius: 'var(--radius-md)', background: 'rgba(148,163,184,0.05)',
                            border: '1px solid rgba(148,163,184,0.08)',
                        }}>
                            <MapPin size={16} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.87rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                    {v.name}
                                    {v.isDefault && <Star size={11} fill="var(--warning-400)" color="var(--warning-400)" />}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                    {teams.length > 1 && `${teamName(v.teamId)} · `}
                                    {v.formattedAddress || 'No address'}
                                    {v.eventCount > 0 ? ` · ${v.eventCount} event${v.eventCount === 1 ? '' : 's'}` : ''}
                                </div>
                                {v.notes && (
                                    <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>{v.notes}</div>
                                )}
                            </div>
                            {v.directionsUrl && (
                                <a className="btn btn-ghost btn-sm" href={v.directionsUrl} target="_blank" rel="noopener noreferrer" aria-label={`Directions to ${v.name}`}>
                                    <Navigation size={14} />
                                </a>
                            )}
                            <button className="btn btn-ghost btn-sm" onClick={() => remove(v)} aria-label={`Delete ${v.name}`}>
                                <Trash2 size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showForm && (
                <VenueForm
                    teams={teams}
                    onClose={() => setShowForm(false)}
                    onCreated={() => { setShowForm(false); load(); }}
                />
            )}
        </div>
    );
}

function VenueForm({ teams, onClose, onCreated }: { teams: Team[]; onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({
        teamId: teams[0]?.id ?? '',
        name: '', address: '', city: '', region: '', postalCode: '',
        latitude: '', longitude: '', notes: '', isDefault: false,
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/venues', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
            });
            const data = await res.json();
            if (data.success) onCreated();
            else setError(data.error || 'Could not save that venue.');
        } catch {
            setError('Something went wrong. Try again.');
        }
        setBusy(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 460 }}>
                <div className="modal-header">
                    <h3 className="modal-title">Add venue</h3>
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close"><X size={16} /></button>
                </div>
                <div className="modal-body">
                    {error && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

                    {teams.length > 1 && (
                        <div className="form-group">
                            <label className="form-label">Team</label>
                            <select className="form-select" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} required>
                                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label">Name</label>
                        <input className="form-input" required placeholder="e.g. North Complex — Pitch 3" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Street address</label>
                        <input className="form-input" placeholder="123 Field Road" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    </div>

                    <div className="modal-form-row">
                        <div className="form-group">
                            <label className="form-label">City</label>
                            <input className="form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">State / region</label>
                            <input className="form-input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                        <input className="form-input" placeholder="e.g. Park in lot B, entrance by the tennis courts" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                    </div>

                    <div className="modal-form-row">
                        <div className="form-group">
                            <label className="form-label">Latitude <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                            <input className="form-input" placeholder="39.7817" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Longitude</label>
                            <input className="form-input" placeholder="-89.6501" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: e.target.value })} />
                        </div>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                        Coordinates make directions land on the exact pitch. Drop a pin in Google Maps, right-click it
                        and copy the numbers.
                    </p>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
                        Make this the team&apos;s home field
                    </label>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy || !form.name.trim()}>
                        {busy ? 'Saving…' : 'Save venue'}
                    </button>
                </div>
            </form>
        </div>
    );
}
