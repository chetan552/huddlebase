'use client';

import { useState, useEffect } from 'react';
import TreasuryPanel from './TreasuryPanel';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreditCard, Check, Download, X } from 'lucide-react';

interface Invoice {
    id: string;
    title: string;
    description: string | null;
    amount: number;
    dueDate: string;
    status: string;
    playerName: string;
    teamName: string;
    createdAt: string;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
    PAID: 'badge-status-paid',
    PENDING: 'badge-status-pending',
    OVERDUE: 'badge-status-overdue',
    CANCELLED: 'badge-status-canceled',
};

export default function PaymentsPage() {
    const { user } = useAuth();
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [showModal, setShowModal] = useState(false);
    const [teams, setTeams] = useState<Array<{ id: string; name: string }>>([]);
    const [players, setPlayers] = useState<Array<{ id: string; name: string; email: string; teamId: string }>>([]);
    const [filter, setFilter] = useState('ALL');
    const [formData, setFormData] = useState({
        title: '', description: '', amount: '', dueDate: '', teamId: '',
    });
    const [selectedPlayerIds, setSelectedPlayerIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);

    const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    const isStaff = user?.role === 'ADMIN' || (user?.role === 'COACH' && user.coachApproved);

    const fetchInvoices = async () => {
        try {
            const res = await fetch('/api/invoices');
            const data = await res.json();
            if (data.success) setInvoices(data.data);
        } catch (err) { console.error(err); }
    };

    const fetchTeams = async () => {
        try {
            const res = await fetch('/api/teams');
            const data = await res.json();
            if (data.success) setTeams(data.data);
        } catch (err) { console.error(err); }
    };

    const fetchPlayers = async () => {
        try {
            const res = await fetch('/api/roster');
            const data = await res.json();
            if (data.success) setPlayers(data.data.map((p: { id: string; userId: string; userName: string; userEmail: string; teamId: string }) => ({ id: p.userId, name: p.userName, email: p.userEmail, teamId: p.teamId })));
        } catch (err) { console.error(err); }
    };

    // Players filtered to the selected team
    const filteredPlayers = formData.teamId
        ? players.filter((p) => p.teamId === formData.teamId)
        : players;

    // Deduplicate players by id (a player may appear in multiple teams)
    const uniqueFilteredPlayers = Array.from(
        new Map(filteredPlayers.map((p) => [p.id, p])).values()
    );

    const allSelected = uniqueFilteredPlayers.length > 0 && uniqueFilteredPlayers.every((p) => selectedPlayerIds.has(p.id));

    const togglePlayer = (id: string) => {
        setSelectedPlayerIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleAllPlayers = () => {
        if (allSelected) {
            setSelectedPlayerIds(new Set());
        } else {
            setSelectedPlayerIds(new Set(uniqueFilteredPlayers.map((p) => p.id)));
        }
    };

    useEffect(() => { fetchInvoices(); fetchTeams(); fetchPlayers(); }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPlayerIds.size === 0) return;
        setLoading(true);
        try {
            const playerIds = Array.from(selectedPlayerIds);
            const endpoint = playerIds.length === 1 ? '/api/invoices' : '/api/invoices/bulk';
            const body = playerIds.length === 1
                ? { ...formData, amount: parseFloat(formData.amount), playerId: playerIds[0] }
                : { ...formData, amount: parseFloat(formData.amount), playerIds };

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (data.success) {
                setShowModal(false);
                setFormData({ title: '', description: '', amount: '', dueDate: '', teamId: '' });
                setSelectedPlayerIds(new Set());
                fetchInvoices();
            }
        } catch (err) { console.error(err); }
        setLoading(false);
    };

    const handleMarkPaid = async (invoiceId: string) => {
        try {
            await fetch(`/api/invoices/${invoiceId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'PAID' }),
            });
            fetchInvoices();
        } catch (err) { console.error(err); }
    };

    const handleCheckout = async (invoice: Invoice) => {
        setPaymentError(null);
        setPayingInvoiceId(invoice.id);
        try {
            const res = await fetch(`/api/invoices/${invoice.id}/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            const data = await res.json();
            if (data.success && data.url) {
                window.location.href = data.url;
                return;
            }
            setPaymentError(data.error || 'Unable to start checkout');
        } catch (err) {
            console.error(err);
            setPaymentError('Unable to start checkout');
        } finally {
            setPayingInvoiceId(null);
        }
    };

    const filteredInvoices = filter === 'ALL' ? invoices : invoices.filter((i) => i.status === filter);

    const totalCollected = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
    const totalPending = invoices.filter((i) => i.status === 'PENDING').reduce((s, i) => s + i.amount, 0);
    const totalOverdue = invoices.filter((i) => i.status === 'OVERDUE').reduce((s, i) => s + i.amount, 0);

    return (
        <div className="page-content">
            <div className="page-header" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ flex: '1 1 auto' }}>
                    <h1 className="page-title page-title--gradient">Payments</h1>
                    <p className="page-subtitle">Manage team dues and invoices</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <a
                        href="/api/invoices?format=csv"
                        download="invoices.csv"
                        className="btn btn-ghost"
                        style={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '0.375rem' }}
                    >
                        <Download size={15} /> Export CSV
                    </a>
                    {isStaff && (
                        <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ whiteSpace: 'nowrap' }}>
                            + Create Invoice
                        </button>
                    )}
                </div>
            </div>

            {/* Staff-only treasury: collected vs outstanding, plus payment plans. */}
            {isStaff && <TreasuryPanel teams={teams} />}

            {/* Summary Cards */}
            <div className="grid-stats">
                <div className="stat-card stat-card--success">
                    <div className="stat-card__label">Collected</div>
                    <div className="stat-card__value">{formatCurrency(totalCollected)}</div>
                </div>
                <div className="stat-card stat-card--warning">
                    <div className="stat-card__label">Pending</div>
                    <div className="stat-card__value">{formatCurrency(totalPending)}</div>
                </div>
                <div className="stat-card stat-card--danger">
                    <div className="stat-card__label">Overdue</div>
                    <div className="stat-card__value">{formatCurrency(totalOverdue)}</div>
                </div>
                <div className="stat-card stat-card--primary">
                    <div className="stat-card__label">Total Invoices</div>
                    <div className="stat-card__value">{invoices.length}</div>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="tabs">
                {['ALL', 'PENDING', 'PAID', 'OVERDUE'].map((f) => (
                    <button
                        key={f}
                        className={`tab ${filter === f ? 'active' : ''}`}
                        onClick={() => setFilter(f)}
                    >
                        {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
                        {f !== 'ALL' && ` (${invoices.filter((i) => i.status === f).length})`}
                    </button>
                ))}
            </div>

            {/* Invoice Table */}
            {paymentError && (
                <div className="auth-error" style={{ marginBottom: '1rem' }}>
                    <span>⚠️</span>{paymentError}
                </div>
            )}
            {filteredInvoices.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon"><CreditCard /></div>
                    <h3 className="empty-state__title">No Invoices</h3>
                    <p className="empty-state__description">
                        {invoices.length === 0 ? 'Create your first invoice to start tracking payments.' : 'No invoices match this filter.'}
                    </p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Invoice</th>
                                <th>Player</th>
                                <th>Team</th>
                                <th>Amount</th>
                                <th>Due Date</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredInvoices.map((inv) => {
                                return (
                                    <tr key={inv.id}>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{inv.title}</div>
                                            {inv.description && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>{inv.description}</div>
                                            )}
                                        </td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{inv.playerName}</td>
                                        <td style={{ color: 'var(--text-secondary)' }}>{inv.teamName}</td>
                                        <td style={{ fontWeight: 600 }}>{formatCurrency(inv.amount)}</td>
                                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                            {formatDate(inv.dueDate)}
                                        </td>
                                        <td>
                                            <span className={`badge ${STATUS_BADGE_CLASS[inv.status] || 'badge-neutral'}`}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td>
                                            {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                                                isStaff ? (
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleMarkPaid(inv.id)}
                                                        style={{ color: 'var(--success-400)', gap: 4 }}
                                                    >
                                                        <Check size={14} /> Mark Paid
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => handleCheckout(inv)}
                                                        disabled={payingInvoiceId === inv.id}
                                                        style={{ gap: 4 }}
                                                    >
                                                        <CreditCard size={14} /> {payingInvoiceId === inv.id ? 'Opening...' : 'Pay Now'}
                                                    </button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Invoice Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Create Invoice</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)} aria-label="Close"><X size={18} /></button>
                        </div>
                        <form onSubmit={handleCreate}>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Title</label>
                                    <input className="form-input" placeholder="e.g., Season Registration Fee" value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })} required />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Description (optional)</label>
                                    <input className="form-input" placeholder="Additional details" value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Amount ($)</label>
                                        <input className="form-input" type="number" step="0.01" min="0" placeholder="150.00" value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Due Date</label>
                                        <input className="form-input" type="date" value={formData.dueDate}
                                            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })} required />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Team</label>
                                    <select className="form-input form-select" value={formData.teamId}
                                        onChange={(e) => { setFormData({ ...formData, teamId: e.target.value }); setSelectedPlayerIds(new Set()); }} required>
                                        <option value="">Select team</option>
                                        {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Players</label>
                                    {formData.teamId ? (
                                        <>
                                            <label style={{
                                                display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                padding: '0.5rem 0.75rem', cursor: 'pointer',
                                                borderBottom: '1px solid rgba(148, 163, 184, 0.10)', marginBottom: '0.25rem',
                                                fontWeight: 600, fontSize: '0.85rem',
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={allSelected}
                                                    onChange={toggleAllPlayers}
                                                    style={{ accentColor: 'var(--primary-500)', width: 16, height: 16 }}
                                                />
                                                All Players ({uniqueFilteredPlayers.length})
                                            </label>
                                            <div className="glass-subtle" style={{
                                                maxHeight: 180, overflowY: 'auto',
                                            }}>
                                                {uniqueFilteredPlayers.length === 0 ? (
                                                    <div style={{ padding: '0.75rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center' }}>
                                                        No players on this team
                                                    </div>
                                                ) : uniqueFilteredPlayers.map((p) => (
                                                    <label key={p.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        padding: '0.5rem 0.75rem', cursor: 'pointer',
                                                        borderBottom: '1px solid rgba(148, 163, 184, 0.06)',
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedPlayerIds.has(p.id)}
                                                            onChange={() => togglePlayer(p.id)}
                                                            style={{ accentColor: 'var(--primary-500)', width: 16, height: 16 }}
                                                        />
                                                        <span style={{ fontSize: '0.9rem' }}>{p.name}</span>
                                                    </label>
                                                ))}
                                            </div>
                                            {selectedPlayerIds.size > 0 && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--primary-400)' }}>
                                                    Creating invoice for <strong>{selectedPlayerIds.size}</strong> {selectedPlayerIds.size === 1 ? 'player' : 'players'}
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="glass-subtle" style={{ padding: '0.75rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center' }}>
                                            Select a team first
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={loading || selectedPlayerIds.size === 0}>
                                    {loading ? 'Creating...' : selectedPlayerIds.size > 1 ? `Create ${selectedPlayerIds.size} Invoices` : 'Create Invoice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}
