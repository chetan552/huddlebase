'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { formatCurrency, formatDate } from '@/lib/utils';

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

const statusStyles: Record<string, { color: string; bg: string }> = {
    PAID: { color: '#4ade80', bg: 'rgba(34, 197, 94, 0.15)' },
    PENDING: { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)' },
    OVERDUE: { color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)' },
    CANCELLED: { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' },
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

    // Checkout State
    const [checkoutInvoice, setCheckoutInvoice] = useState<Invoice | null>(null);
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    const isStaff = user?.role === 'ADMIN' || user?.role === 'COACH';

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

    const handleCheckoutSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!checkoutInvoice) return;

        setCheckoutLoading(true);
        try {
            // Simulated 1-second delay for processing payment
            await new Promise(resolve => setTimeout(resolve, 1000));

            await fetch(`/api/invoices/${checkoutInvoice.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'PAID' }),
            });

            setCheckoutInvoice(null);
            fetchInvoices();
        } catch (err) { console.error(err); }
        setCheckoutLoading(false);
    };

    const filteredInvoices = filter === 'ALL' ? invoices : invoices.filter((i) => i.status === filter);

    const totalCollected = invoices.filter((i) => i.status === 'PAID').reduce((s, i) => s + i.amount, 0);
    const totalPending = invoices.filter((i) => i.status === 'PENDING').reduce((s, i) => s + i.amount, 0);
    const totalOverdue = invoices.filter((i) => i.status === 'OVERDUE').reduce((s, i) => s + i.amount, 0);

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">Payments</h1>
                    <p className="page-subtitle">Manage team dues and invoices</p>
                </div>
                {isStaff && (
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                        + Create Invoice
                    </button>
                )}
            </div>

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
            {filteredInvoices.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon">💵</div>
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
                                const style = statusStyles[inv.status] || statusStyles.PENDING;
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
                                            <span className="badge" style={{
                                                background: style.bg, color: style.color,
                                                border: `1px solid ${style.color}40`,
                                            }}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td>
                                            {inv.status !== 'PAID' && inv.status !== 'CANCELLED' && (
                                                isStaff ? (
                                                    <button
                                                        className="btn btn-ghost btn-sm"
                                                        onClick={() => handleMarkPaid(inv.id)}
                                                        style={{ color: 'var(--success-400)' }}
                                                    >
                                                        ✓ Mark Paid
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="btn btn-primary btn-sm"
                                                        onClick={() => setCheckoutInvoice(inv)}
                                                    >
                                                        💳 Pay Now
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
                            <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}>✕</button>
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
                                                borderBottom: '1px solid var(--surface-600)', marginBottom: '0.25rem',
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
                                            <div style={{
                                                maxHeight: 180, overflowY: 'auto',
                                                border: '1px solid var(--surface-600)', borderRadius: '0.5rem',
                                                background: 'var(--surface-700)',
                                            }}>
                                                {uniqueFilteredPlayers.length === 0 ? (
                                                    <div style={{ padding: '0.75rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', textAlign: 'center' }}>
                                                        No players on this team
                                                    </div>
                                                ) : uniqueFilteredPlayers.map((p) => (
                                                    <label key={p.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: '0.5rem',
                                                        padding: '0.5rem 0.75rem', cursor: 'pointer',
                                                        borderBottom: '1px solid var(--surface-600)',
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
                                        <div style={{ padding: '0.75rem', color: 'var(--text-tertiary)', fontSize: '0.85rem', border: '1px solid var(--surface-600)', borderRadius: '0.5rem', background: 'var(--surface-700)', textAlign: 'center' }}>
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

            {/* Simulated Checkout Modal */}
            {checkoutInvoice && (
                <div className="modal-overlay" onClick={() => setCheckoutInvoice(null)}>
                    <div className="modal" style={{ maxWidth: 450 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
                            <h2 className="modal-title">Complete Payment</h2>
                            <button className="btn btn-ghost btn-icon" onClick={() => setCheckoutInvoice(null)}>✕</button>
                        </div>
                        <form onSubmit={handleCheckoutSubmit}>
                            <div className="modal-body">
                                <div style={{ background: 'var(--surface-700)', padding: '1rem', borderRadius: '0.5rem', marginBottom: '1.5rem' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Invoice for</span>
                                        <span style={{ fontWeight: 600 }}>{checkoutInvoice.playerName}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                                        <span style={{ color: 'var(--text-secondary)' }}>Item</span>
                                        <span style={{ fontWeight: 600 }}>{checkoutInvoice.title}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--surface-600)', paddingTop: '1rem', fontSize: '1.2rem' }}>
                                        <span style={{ fontWeight: 600 }}>Total</span>
                                        <span style={{ fontWeight: 800 }}>{formatCurrency(checkoutInvoice.amount)}</span>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Card Number</label>
                                    <div style={{ position: 'relative' }}>
                                        <div style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}>💳</div>
                                        <input className="form-input" style={{ paddingLeft: '2.5rem', fontFamily: 'monospace', letterSpacing: '2px' }} placeholder="0000 0000 0000 0000" required maxLength={19} />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Expiry (MM/YY)</label>
                                        <input className="form-input" placeholder="MM/YY" required maxLength={5} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">CVC</label>
                                        <input className="form-input" type="password" placeholder="123" required maxLength={4} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Name on Card</label>
                                    <input className="form-input" placeholder="Jane Doe" required />
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '1rem', justifyContent: 'center' }}>
                                    <span>🔒 This is a simulated secure checkout.</span>
                                </div>
                            </div>
                            <div className="modal-footer" style={{ borderTop: 'none', paddingTop: 0 }}>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '0.75rem' }} disabled={checkoutLoading}>
                                    {checkoutLoading ? 'Processing...' : `Pay ${formatCurrency(checkoutInvoice.amount)}`}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
