'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { getAvatarColor, getInitials } from '@/lib/utils';

interface Player {
    id: string;
    name: string;
    email: string;
    role: string;
    jersey: string | null;
    position: string | null;
    category: string | null;
    phone: string | null;
    teamName: string;
}

export default function RosterPage() {
    const { user } = useAuth();
    const [players, setPlayers] = useState<Player[]>([]);
    const [filter, setFilter] = useState('');

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const team = params.get('team');
        if (team) setFilter(team);
    }, []);
    const [showModal, setShowModal] = useState(false);
    const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
    const [formData, setFormData] = useState({
        name: '', email: '', teamId: '', role: 'PLAYER', jersey: '', position: '', category: '', phone: '',
    });
    const [loading, setLoading] = useState(false);
    const isStaff = user?.role === 'ADMIN' || user?.role === 'COACH';

    const fetchRoster = async () => {
        try {
            const res = await fetch('/api/roster');
            const data = await res.json();
            if (data.success) {
                setPlayers(data.data.map((p: any) => ({
                    ...p,
                    name: p.userName || p.name,
                    email: p.userEmail || p.email
                })));
            }
        } catch (err) { console.error(err); }
    };

    const fetchTeams = async () => {
        try {
            const res = await fetch('/api/teams');
            const data = await res.json();
            if (data.success) setTeams(data.data);
        } catch (err) { console.error(err); }
    };

    useEffect(() => { fetchRoster(); fetchTeams(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await fetch('/api/roster', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                setFormData({ name: '', email: '', teamId: '', role: 'PLAYER', jersey: '', position: '', category: '', phone: '' });
                fetchRoster();
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleRemove = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to remove ${name} from this team?`)) return;
        try {
            const res = await fetch(`/api/roster/${id}`, {
                method: 'DELETE',
            });
            const data = await res.json();
            if (data.success) {
                fetchRoster();
            } else {
                alert(data.error || 'Failed to remove player');
            }
        } catch (err) {
            console.error(err);
            alert('Failed to remove player');
        }
    };

    const filteredPlayers = players.filter((p) =>
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        p.email.toLowerCase().includes(filter.toLowerCase()) ||
        p.position?.toLowerCase().includes(filter.toLowerCase()) ||
        p.category?.toLowerCase().includes(filter.toLowerCase()) ||
        p.teamName.toLowerCase().includes(filter.toLowerCase())
    );

    const roleColors: Record<string, string> = {
        COACH: '#3b82f6', PLAYER: '#14b8a6', PARENT: '#f59e0b', MANAGER: '#8b5cf6',
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Roster</h1>
                    <p className="page-subtitle">{players.length} members across all teams</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <input
                        className="form-input"
                        placeholder="🔍 Search players..."
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        style={{ width: '220px' }}
                    />
                    {isStaff && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                            + Add Player
                        </button>
                    )}
                </div>
            </div>

            {filteredPlayers.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon">🏃</div>
                    <h3 className="empty-state__title">No Players Found</h3>
                    <p className="empty-state__description">
                        {players.length === 0
                            ? 'Create a team first, then add players to your roster.'
                            : 'No players match your search.'}
                    </p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Role</th>
                                <th>Team</th>
                                <th>Category</th>
                                <th>Position</th>
                                <th>Jersey</th>
                                <th>Contact</th>
                                {isStaff && <th>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPlayers.map((player) => (
                                <tr key={player.id}>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div
                                                className="avatar avatar-sm"
                                                style={{ background: getAvatarColor(player.name) }}
                                            >
                                                {getInitials(player.name)}
                                            </div>
                                            <div>
                                                <Link href={`/roster/${player.id}`} style={{ color: 'var(--primary-400)', textDecoration: 'none', fontWeight: 600 }} className="hover-underline">
                                                    {player.name}
                                                </Link>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{player.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="badge" style={{
                                            background: `${roleColors[player.role]}20`,
                                            color: roleColors[player.role],
                                            border: `1px solid ${roleColors[player.role]}40`,
                                        }}>
                                            {player.role}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{player.teamName}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                        {player.category ? (
                                            <span style={{
                                                background: 'var(--surface-700)', padding: '2px 8px',
                                                borderRadius: '4px', fontSize: '0.85rem',
                                            }}>
                                                {player.category}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{player.position || '—'}</td>
                                    <td>
                                        {player.jersey ? (
                                            <span style={{
                                                background: 'var(--surface-700)', padding: '2px 8px',
                                                borderRadius: '4px', fontWeight: 600, fontSize: '0.85rem',
                                            }}>
                                                #{player.jersey}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        {player.phone || '—'}
                                    </td>
                                    {isStaff && (
                                        <td>
                                            <button
                                                className="btn btn-ghost btn-icon"
                                                title="Remove from Team"
                                                onClick={() => handleRemove(player.id, player.name)}
                                                style={{ color: 'var(--danger-400)' }}
                                            >
                                                🗑️
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add Player Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add Player</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Full Name</label>
                                    <input className="form-input" placeholder="John Smith" value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Email</label>
                                    <input className="form-input" type="email" placeholder="john@example.com" value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Team</label>
                                        <select className="form-input form-select" value={formData.teamId}
                                            onChange={(e) => setFormData({ ...formData, teamId: e.target.value })} required>
                                            <option value="">Select team</option>
                                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Role</label>
                                        <select className="form-input form-select" value={formData.role}
                                            onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                                            <option value="PLAYER">Player</option>
                                            <option value="COACH">Coach</option>
                                            <option value="PARENT">Parent</option>
                                            <option value="MANAGER">Manager</option>
                                        </select>
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Position</label>
                                        <input className="form-input" placeholder="e.g., Forward" value={formData.position}
                                            onChange={(e) => setFormData({ ...formData, position: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Category</label>
                                        <input className="form-input" placeholder="e.g., Varsity, U12" value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Jersey #</label>
                                        <input className="form-input" placeholder="e.g., 10" value={formData.jersey}
                                            onChange={(e) => setFormData({ ...formData, jersey: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Phone</label>
                                        <input className="form-input" placeholder="(555) 123-4567" value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading}>
                                    {loading ? 'Adding...' : 'Add Player'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
