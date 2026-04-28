'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { getAvatarColor, getInitials } from '@/lib/utils';
import ConfirmDialog from '@/components/ConfirmDialog';
import { ClipboardList, Download, Search, Trash2, Upload, X } from 'lucide-react';

interface Player {
    id: string;
    userId: string;
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
    const [pendingRemove, setPendingRemove] = useState<{ id: string; name: string } | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const isStaff = user?.role === 'ADMIN' || user?.role === 'COACH';

    // Import state
    const [showImportModal, setShowImportModal] = useState(false);
    const [importTeamId, setImportTeamId] = useState('');
    const [importRows, setImportRows] = useState<Record<string, string>[]>([]);
    const [importLoading, setImportLoading] = useState(false);
    const [importResult, setImportResult] = useState<{ created: string[]; skipped: string[]; errors: Array<{ row: number; name: string; error: string }> } | null>(null);
    const [importFileError, setImportFileError] = useState<string | null>(null);

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
        setFormError(null);
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
            } else {
                setFormError(data.error || 'Failed to add player');
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleRemove = async () => {
        if (!pendingRemove) return;
        const res = await fetch(`/api/roster/${pendingRemove.id}`, { method: 'DELETE' });
        const data = await res.json();
        if (data.success) {
            fetchRoster();
        } else {
            throw new Error(data.error || 'Failed to remove player');
        }
    };

    const parseCSV = (text: string): Record<string, string>[] => {
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) return [];
        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/[^a-z]/g, ''));
        return lines.slice(1).map((line) => {
            const cols = line.match(/("(?:[^"]|"")*"|[^,]*)/g)?.map((c) =>
                c.startsWith('"') ? c.slice(1, -1).replace(/""/g, '"') : c
            ) ?? [];
            const row: Record<string, string> = {};
            headers.forEach((h, i) => { row[h] = (cols[i] ?? '').trim(); });
            return row;
        }).filter((r) => r.name || r.email);
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        setImportResult(null);
        setImportFileError(null);
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const rows = parseCSV(ev.target?.result as string);
            if (rows.length === 0) {
                setImportFileError('No valid rows found. Make sure the file has a header row and at least one data row.');
                setImportRows([]);
            } else {
                setImportRows(rows);
            }
        };
        reader.readAsText(file);
    };

    const handleImport = async () => {
        if (!importTeamId) { setImportFileError('Please select a team.'); return; }
        if (importRows.length === 0) { setImportFileError('No rows to import.'); return; }
        setImportLoading(true);
        setImportFileError(null);
        try {
            const res = await fetch('/api/roster/import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ teamId: importTeamId, records: importRows }),
            });
            const data = await res.json();
            if (data.success) {
                setImportResult(data.data);
                fetchRoster();
            } else {
                setImportFileError(data.error || 'Import failed.');
            }
        } catch {
            setImportFileError('Connection error. Please try again.');
        } finally {
            setImportLoading(false);
        }
    };

    const filteredPlayers = players.filter((p) =>
        p.name.toLowerCase().includes(filter.toLowerCase()) ||
        p.email.toLowerCase().includes(filter.toLowerCase()) ||
        p.position?.toLowerCase().includes(filter.toLowerCase()) ||
        p.category?.toLowerCase().includes(filter.toLowerCase()) ||
        p.teamName.toLowerCase().includes(filter.toLowerCase())
    );

    const ROLE_BADGE: Record<string, string> = {
        ADMIN: 'badge-role-admin',
        COACH: 'badge-role-coach',
        PLAYER: 'badge-role-player',
        PARENT: 'badge-role-parent',
        MANAGER: 'badge-role-admin',
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title page-title--gradient">Roster</h1>
                    <p className="page-subtitle">{players.length} members across all teams</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', width: '100%', maxWidth: '400px' }}>
                    <div style={{ position: 'relative', flex: '1 1 auto', minWidth: '150px' }}>
                        <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} />
                        <input
                            className="form-input"
                            placeholder="Search players…"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                            style={{ paddingLeft: 38, width: '100%' }}
                        />
                    </div>
                    <a
                        href="/api/roster?format=csv"
                        download="roster.csv"
                        className="btn btn-ghost"
                        style={{ flex: '0 0 auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                        <Download size={15} /> Export CSV
                    </a>
                    {isStaff && (
                        <button
                            className="btn btn-ghost"
                            onClick={() => { setShowImportModal(true); setImportRows([]); setImportResult(null); setImportFileError(null); setImportTeamId(''); }}
                            style={{ flex: '0 0 auto', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                        >
                            <Upload size={15} /> Import CSV
                        </button>
                    )}
                    {isStaff && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ flex: '1 1 auto', whiteSpace: 'nowrap', justifyContent: 'center' }}>
                            + Add Player
                        </button>
                    )}
                </div>
            </div>

            {filteredPlayers.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon"><ClipboardList /></div>
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
                                                <Link href={`/roster/${player.userId}`} style={{ color: 'var(--primary-400)', textDecoration: 'none', fontWeight: 600 }} className="hover-underline">
                                                    {player.name}
                                                </Link>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{player.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge ${ROLE_BADGE[player.role] || 'badge-neutral'}`}>
                                            {player.role}
                                        </span>
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{player.teamName}</td>
                                    <td style={{ color: 'var(--text-secondary)' }}>
                                        {player.category ? (
                                            <span className="badge badge-neutral">{player.category}</span>
                                        ) : '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-secondary)' }}>{player.position || '—'}</td>
                                    <td>
                                        {player.jersey ? (
                                            <span className="badge badge-neutral" style={{ fontWeight: 600 }}>
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
                                                aria-label={`Remove ${player.name}`}
                                                onClick={() => setPendingRemove({ id: player.id, name: player.name })}
                                                style={{ color: 'var(--text-tertiary)', width: 32, height: 32 }}
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {pendingRemove && (
                <ConfirmDialog
                    title="Remove Player"
                    description={`Are you sure you want to remove ${pendingRemove.name} from this team?`}
                    confirmLabel="Remove"
                    tone="danger"
                    onConfirm={handleRemove}
                    onClose={() => setPendingRemove(null)}
                />
            )}

            {/* Import CSV Modal */}
            {showImportModal && (
                <div className="modal-overlay" onClick={() => setShowImportModal(false)}>
                    <div className="modal" style={{ maxWidth: '640px', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Import Players from CSV</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowImportModal(false)} aria-label="Close"><X size={18} /></button>
                        </div>
                        <div className="modal-body">
                            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                CSV must have a header row with columns: <strong>name</strong>, <strong>email</strong>, and optionally role, jersey, position, phone, category.
                            </p>

                            <div className="form-group">
                                <label className="form-label">Team <span style={{ color: 'var(--danger-400)' }}>*</span></label>
                                <select
                                    className="form-input form-select"
                                    value={importTeamId}
                                    onChange={(e) => setImportTeamId(e.target.value)}
                                >
                                    <option value="">Select team</option>
                                    {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                </select>
                            </div>

                            <div className="form-group">
                                <label className="form-label">CSV File <span style={{ color: 'var(--danger-400)' }}>*</span></label>
                                <input
                                    type="file"
                                    accept=".csv,text/csv"
                                    className="form-input"
                                    style={{ cursor: 'pointer' }}
                                    onChange={handleImportFile}
                                />
                            </div>

                            {importFileError && (
                                <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-400)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                                    {importFileError}
                                </div>
                            )}

                            {importRows.length > 0 && !importResult && (
                                <div>
                                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                                        {importRows.length} row{importRows.length !== 1 ? 's' : ''} detected — preview (first 5):
                                    </p>
                                    <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--surface-600)' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--surface-700)' }}>
                                                    {['name', 'email', 'role', 'jersey', 'position'].map((h) => (
                                                        <th key={h} style={{ padding: '0.4rem 0.6rem', textAlign: 'left', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', fontSize: '0.7rem' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {importRows.slice(0, 5).map((row, i) => (
                                                    <tr key={i} style={{ borderTop: '1px solid var(--surface-600)' }}>
                                                        {['name', 'email', 'role', 'jersey', 'position'].map((h) => (
                                                            <td key={h} style={{ padding: '0.4rem 0.6rem', color: 'var(--text-primary)' }}>{row[h] || '—'}</td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {importResult && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                    {importResult.created.length > 0 && (
                                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(34,197,94,0.1)', color: 'var(--success-400)', fontSize: '0.85rem' }}>
                                            ✓ Added {importResult.created.length} player{importResult.created.length !== 1 ? 's' : ''}: {importResult.created.join(', ')}
                                        </div>
                                    )}
                                    {importResult.skipped.length > 0 && (
                                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(245,158,11,0.1)', color: 'var(--warning-400)', fontSize: '0.85rem' }}>
                                            ⚠ Skipped {importResult.skipped.length} (already on team): {importResult.skipped.join(', ')}
                                        </div>
                                    )}
                                    {importResult.errors.length > 0 && (
                                        <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-400)', fontSize: '0.85rem' }}>
                                            ✗ {importResult.errors.length} error{importResult.errors.length !== 1 ? 's' : ''}:
                                            <ul style={{ margin: '0.25rem 0 0 1rem', padding: 0 }}>
                                                {importResult.errors.map((e, i) => (
                                                    <li key={i}>Row {e.row} ({e.name}): {e.error}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-ghost" onClick={() => setShowImportModal(false)}>
                                {importResult ? 'Close' : 'Cancel'}
                            </button>
                            {!importResult && (
                                <button
                                    className="btn btn-primary"
                                    onClick={handleImport}
                                    disabled={importLoading || importRows.length === 0 || !importTeamId}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                                >
                                    <Upload size={14} />
                                    {importLoading ? 'Importing…' : `Import ${importRows.length > 0 ? importRows.length + ' Players' : ''}`}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Add Player Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Add Player</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => { setShowModal(false); setFormError(null); }} aria-label="Close"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                {formError && (
                                    <div style={{ padding: '0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(239, 68, 68, 0.12)', color: 'var(--danger-400)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                                        {formError}
                                    </div>
                                )}
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
