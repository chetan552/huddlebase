'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { SPORTS } from '@/lib/constants';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Users, Trash2, X, Image as ImageIcon, Loader2, Upload, Check } from 'lucide-react';

interface Team {
    id: string;
    name: string;
    sport: string;
    season: string | null;
    color: string;
    logo: string | null;
    memberCount: number;
    upcomingEvents: number;
    record: { wins: number; losses: number; draws: number };
}

export default function TeamsPage() {
    const { user } = useAuth();
    const [teams, setTeams] = useState<Team[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ name: '', sport: 'Basketball', season: '', color: '#3b82f6' });
    const [loading, setLoading] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);
    const isStaff = user?.role === 'ADMIN' || (user?.role === 'COACH' && user.coachApproved);
    const [logoUrl, setLogoUrl] = useState<string | null>(null);
    const [logoUploading, setLogoUploading] = useState(false);
    const logoInputRef = useRef<HTMLInputElement>(null);

    const fetchTeams = async () => {
        try {
            const res = await fetch('/api/teams');
            const data = await res.json();
            if (data.success) setTeams(data.data);
        } catch (err) {
            console.error('Failed to fetch teams:', err);
        }
    };

    useEffect(() => { fetchTeams(); }, []);

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setLogoUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) setLogoUrl(data.data.url);
        } catch { /* silent */ }
        setLogoUploading(false);
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/teams', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, logo: logoUrl }),
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                setFormData({ name: '', sport: 'Basketball', season: '', color: '#3b82f6' });
                setLogoUrl(null);
                fetchTeams();
            }
        } catch (err) {
            console.error('Failed to create team:', err);
        }
        setLoading(false);
    };

    const handleDeleteTeam = async (e: React.MouseEvent, id: string, name: string) => {
        e.preventDefault();
        e.stopPropagation();
        setPendingDelete({ id, name });
    };

    const confirmDeleteTeam = async () => {
        if (!pendingDelete) return;
        const res = await fetch(`/api/teams/${pendingDelete.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            fetchTeams();
        } else {
            throw new Error(data.error || 'Failed to delete team.');
        }
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title page-title--gradient">Teams</h1>
                    <p className="page-subtitle">Manage your teams and clubs</p>
                </div>
                {isStaff && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + Create Team
                    </button>
                )}
            </div>

            {teams.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon"><Users /></div>
                    <h3 className="empty-state__title">No Teams Yet</h3>
                    {isStaff ? (
                        <>
                            <p className="empty-state__description">
                                Create your first team to get started with scheduling, roster management, and more.
                            </p>
                            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                                + Create Your First Team
                            </button>
                        </>
                    ) : (
                        <p className="empty-state__description">
                            You haven&apos;t been added to any teams yet. Ask your coach or team admin to add you!
                        </p>
                    )}
                </div>
            ) : (
                <div className="grid-cards">
                    {teams.map((team) => (
                        <Link
                            href={`/roster?team=${encodeURIComponent(team.name)}`}
                            key={team.id}
                            className="card card-interactive"
                            style={{ display: 'block', cursor: 'pointer', textDecoration: 'none', color: 'inherit', position: 'relative', overflow: 'hidden' }}
                        >
                            <div style={{
                                position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                                background: `linear-gradient(90deg, ${team.color}, ${team.color}99)`,
                            }} />
                            {isStaff && (
                                <button
                                    className="btn btn-ghost btn-icon"
                                    style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', color: 'var(--text-tertiary)', zIndex: 10, width: 32, height: 32 }}
                                    aria-label="Delete team"
                                    onClick={(e) => handleDeleteTeam(e, team.id, team.name)}
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                {team.logo ? (
                                    <img
                                        src={team.logo}
                                        alt={`${team.name} logo`}
                                        style={{ width: 48, height: 48, borderRadius: '0.75rem', objectFit: 'cover', flexShrink: 0, border: `2px solid ${team.color}` }}
                                    />
                                ) : (
                                    <div style={{
                                        width: 48, height: 48, borderRadius: '0.75rem',
                                        background: team.color, display: 'flex', alignItems: 'center',
                                        justifyContent: 'center', fontSize: '1.5rem', color: 'white',
                                        fontWeight: 700, flexShrink: 0,
                                        boxShadow: `0 4px 12px ${team.color}40, inset 0 1px 0 rgba(255,255,255,0.18)`,
                                    }}>
                                        {team.name.charAt(0)}
                                    </div>
                                )}
                                <div>
                                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.01em' }}>{team.name}</h3>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                                        {team.sport} {team.season && `· ${team.season}`}
                                    </p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem' }}>
                                <div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{team.memberCount}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Members</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>{team.upcomingEvents}</div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Events</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                                        {team.record.wins + team.record.losses + team.record.draws > 0
                                            ? `${team.record.wins}W — ${team.record.losses}L — ${team.record.draws}D`
                                            : '—'}
                                    </div>
                                    <div style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Record</div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {/* Create Team Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Create Team</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)} aria-label="Close">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Team Name</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g., Thunder FC"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Sport</label>
                                    <select
                                        className="form-input form-select"
                                        value={formData.sport}
                                        onChange={(e) => setFormData({ ...formData, sport: e.target.value })}
                                    >
                                        {SPORTS.map((s) => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Season (optional)</label>
                                    <input
                                        className="form-input"
                                        placeholder="e.g., Spring 2026"
                                        value={formData.season}
                                        onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Team Color</label>
                                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        {['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#14b8a6', '#ec4899', '#06b6d4'].map((c) => {
                                            const selected = formData.color === c;
                                            return (
                                                <button
                                                    key={c}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, color: c })}
                                                    aria-label={`Pick color ${c}`}
                                                    aria-pressed={selected}
                                                    style={{
                                                        width: 36, height: 36, borderRadius: '0.5rem',
                                                        background: c,
                                                        border: 'none',
                                                        outline: selected ? '2px solid var(--text-primary)' : '2px solid transparent',
                                                        outlineOffset: 2,
                                                        cursor: 'pointer',
                                                        transition: 'all var(--transition-fast)',
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        color: 'white',
                                                        boxShadow: selected ? `0 0 16px ${c}80, inset 0 1px 0 rgba(255,255,255,0.2)` : 'inset 0 1px 0 rgba(255,255,255,0.15)',
                                                    }}
                                                >
                                                    {selected && <Check size={16} strokeWidth={3} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Team Logo (optional)</label>
                                    <div
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '1rem',
                                        }}
                                    >
                                        {logoUrl ? (
                                            <img
                                                src={logoUrl}
                                                alt="Team logo"
                                                style={{ width: 48, height: 48, borderRadius: '0.75rem', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: 48, height: 48, borderRadius: '0.75rem',
                                                background: 'rgba(148, 163, 184, 0.08)', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                                color: 'var(--text-tertiary)',
                                                border: '1px dashed rgba(148, 163, 184, 0.20)',
                                            }}><ImageIcon size={20} /></div>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-outline btn-sm"
                                            onClick={() => logoInputRef.current?.click()}
                                            disabled={logoUploading}
                                        >
                                            {logoUploading
                                                ? (<><Loader2 size={14} className="animate-spin" /> Uploading…</>)
                                                : (<><Upload size={14} /> Upload Logo</>)}
                                        </button>
                                        <input
                                            ref={logoInputRef}
                                            type="file"
                                            accept="image/jpeg,image/png,image/webp"
                                            style={{ display: 'none' }}
                                            onChange={handleLogoUpload}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Creating...' : 'Create Team'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {pendingDelete && (
                <ConfirmDialog
                    title="Delete Team"
                    description={`Are you sure you want to completely delete "${pendingDelete.name}"? This cannot be undone and will remove all members, events, and history.`}
                    confirmLabel="Delete"
                    tone="danger"
                    onConfirm={confirmDeleteTeam}
                    onClose={() => setPendingDelete(null)}
                />
            )}
        </div>
    );
}
