'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAvatarColor, getInitials } from '@/lib/utils';
import { Wallet, X, CalendarRange, Undo2, ChevronDown, ChevronUp } from 'lucide-react';

interface TreasurySummary {
    billed: number;
    collected: number;
    refunded: number;
    net: number;
    outstanding: number;
    overdue: number;
    invoiceCount: number;
    paidCount: number;
    overdueCount: number;
    collectionRate: number;
}

interface PlayerRow {
    id: string;
    name: string;
    avatar: string | null;
    billed: number;
    paid: number;
    outstanding: number;
    overdue: number;
    invoices: number;
}

interface RefundRow {
    id: string;
    amount: number;
    reason: string | null;
    method: string;
    invoiceTitle: string;
    playerName: string;
    createdAt: string;
}

interface Team { id: string; name: string }

const money = (n: number) => `$${n.toFixed(2)}`;

/**
 * Staff-only treasury view: what the team has collected versus what's still owed,
 * plus a per-family breakdown so a coach knows who to chase.
 */
export default function TreasuryPanel({ teams }: { teams: Team[] }) {
    const [summary, setSummary] = useState<TreasurySummary | null>(null);
    const [byPlayer, setByPlayer] = useState<PlayerRow[]>([]);
    const [refunds, setRefunds] = useState<RefundRow[]>([]);
    const [expanded, setExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [showPlanForm, setShowPlanForm] = useState(false);

    const load = useCallback(async () => {
        try {
            const res = await fetch('/api/treasury');
            const data = await res.json();
            if (data.success) {
                setSummary(data.data.summary);
                setByPlayer(data.data.byPlayer);
                setRefunds(data.data.recentRefunds);
            }
        } catch { /* panel simply stays empty */ }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    if (loading || !summary || summary.invoiceCount === 0) return null;

    const owing = byPlayer.filter((p) => p.outstanding > 0);

    return (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h2 className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Wallet size={18} color="var(--primary-400)" /> Treasury
                </h2>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {teams.length > 0 && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowPlanForm(true)}>
                            <CalendarRange size={14} /> Payment plan
                        </button>
                    )}
                    <button className="btn btn-ghost btn-sm" onClick={() => setExpanded(!expanded)}>
                        {expanded ? <><ChevronUp size={14} /> Less</> : <><ChevronDown size={14} /> Details</>}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
                <Metric label="Billed" value={money(summary.billed)} />
                <Metric label="Collected" value={money(summary.collected)} tone="success" />
                {summary.refunded > 0 && <Metric label="Refunded" value={money(summary.refunded)} tone="warning" />}
                <Metric label="Net held" value={money(summary.net)} tone="success" />
                <Metric label="Outstanding" value={money(summary.outstanding)} tone={summary.outstanding > 0 ? 'warning' : undefined} />
                <Metric label="Overdue" value={money(summary.overdue)} tone={summary.overdue > 0 ? 'danger' : undefined} />
                <Metric label="Collected" value={`${summary.collectionRate}%`} />
            </div>

            {expanded && (
                <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid rgba(148,163,184,0.1)' }}>
                    <h3 style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.65rem', color: 'var(--text-secondary)' }}>
                        Outstanding by family
                    </h3>
                    {owing.length === 0 ? (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>Everyone is paid up.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                            {owing.map((p) => (
                                <div key={p.id} style={{
                                    display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.5rem 0.6rem',
                                    borderRadius: 'var(--radius-md)', background: 'rgba(148,163,184,0.05)',
                                }}>
                                    <div className="avatar avatar-sm" style={{ background: getAvatarColor(p.name) }}>
                                        {getInitials(p.name)}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.name}</div>
                                        <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                            {p.invoices} invoice{p.invoices === 1 ? '' : 's'} · {money(p.paid)} paid of {money(p.billed)}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>{money(p.outstanding)}</div>
                                        {p.overdue > 0 && (
                                            <div style={{ fontSize: '0.7rem', color: 'var(--danger-400)' }}>
                                                {money(p.overdue)} overdue
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {refunds.length > 0 && (
                        <>
                            <h3 style={{ fontSize: '0.85rem', fontWeight: 700, margin: '1.25rem 0 0.65rem', color: 'var(--text-secondary)' }}>
                                Recent refunds
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                {refunds.map((r) => (
                                    <div key={r.id} style={{
                                        display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.45rem 0.6rem',
                                        borderRadius: 'var(--radius-md)', background: 'rgba(148,163,184,0.05)', fontSize: '0.8rem',
                                    }}>
                                        <Undo2 size={14} color="var(--warning-400)" style={{ flexShrink: 0 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <span style={{ fontWeight: 600 }}>{r.playerName}</span>
                                            <span style={{ color: 'var(--text-tertiary)' }}> · {r.invoiceTitle}</span>
                                            {r.reason && <span style={{ color: 'var(--text-tertiary)' }}> · {r.reason}</span>}
                                        </div>
                                        <span style={{ fontWeight: 600, color: 'var(--warning-400)' }}>−{money(r.amount)}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {showPlanForm && (
                <PaymentPlanForm
                    teams={teams}
                    onClose={() => setShowPlanForm(false)}
                    onCreated={() => { setShowPlanForm(false); load(); }}
                />
            )}
        </div>
    );
}

function Metric({ label, value, tone }: { label: string; value: string; tone?: 'success' | 'warning' | 'danger' }) {
    const color = tone === 'success' ? 'var(--success-400)'
        : tone === 'warning' ? 'var(--warning-400)'
        : tone === 'danger' ? 'var(--danger-400)'
        : 'var(--text-primary)';
    return (
        <div style={{ padding: '0.65rem 0.75rem', borderRadius: 'var(--radius-md)', background: 'rgba(148,163,184,0.05)' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {label}
            </div>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color, marginTop: '0.15rem' }}>{value}</div>
        </div>
    );
}

function PaymentPlanForm({ teams, onClose, onCreated }: { teams: Team[]; onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({
        teamId: teams[0]?.id ?? '',
        title: '',
        description: '',
        totalAmount: '',
        installments: '3',
        frequency: 'MONTHLY',
        firstDueDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        notify: true,
    });
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<{ invoicesCreated: number; playerCount: number; amounts: number[] } | null>(null);

    const total = Number(form.totalAmount) || 0;
    const count = Number(form.installments) || 1;
    const perPayment = count > 0 ? total / count : 0;

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/payment-plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    totalAmount: total,
                    installments: count,
                }),
            });
            const data = await res.json();
            if (data.success) setResult(data.data);
            else setError(data.error || 'Could not create that plan.');
        } catch {
            setError('Something went wrong. Try again.');
        }
        setBusy(false);
    };

    if (result) {
        return (
            <div className="modal-overlay" onClick={onCreated}>
                <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420 }}>
                    <div className="modal-header">
                        <h3 className="modal-title">Plan created</h3>
                        <button onClick={onCreated} className="btn btn-ghost btn-sm" aria-label="Close"><X size={16} /></button>
                    </div>
                    <div className="modal-body">
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                            Created {result.invoicesCreated} invoices across {result.playerCount} player
                            {result.playerCount === 1 ? '' : 's'}.
                        </p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                            Instalments: {result.amounts.map((a) => `$${a.toFixed(2)}`).join(' · ')}
                        </p>
                    </div>
                    <div className="modal-footer">
                        <button className="btn btn-primary" onClick={onCreated}>Done</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 460 }}>
                <div className="modal-header">
                    <h3 className="modal-title">New payment plan</h3>
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close"><X size={16} /></button>
                </div>
                <div className="modal-body">
                    {error && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

                    <div className="form-group">
                        <label className="form-label">Team</label>
                        <select className="form-select" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} required>
                            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input className="form-input" required placeholder="e.g. Season fee" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>

                    <div className="modal-form-row">
                        <div className="form-group">
                            <label className="form-label">Total per player</label>
                            <input className="form-input" type="number" min="0.01" step="0.01" required placeholder="300.00" value={form.totalAmount} onChange={(e) => setForm({ ...form, totalAmount: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Instalments</label>
                            <input className="form-input" type="number" min="1" max="24" required value={form.installments} onChange={(e) => setForm({ ...form, installments: e.target.value })} />
                        </div>
                    </div>

                    <div className="modal-form-row">
                        <div className="form-group">
                            <label className="form-label">Frequency</label>
                            <select className="form-select" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })}>
                                <option value="MONTHLY">Monthly</option>
                                <option value="BIWEEKLY">Every 2 weeks</option>
                                <option value="WEEKLY">Weekly</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">First payment due</label>
                            <input className="form-input" type="date" required value={form.firstDueDate} onChange={(e) => setForm({ ...form, firstDueDate: e.target.value })} />
                        </div>
                    </div>

                    {total > 0 && (
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.6rem', borderRadius: 'var(--radius-md)', background: 'rgba(59,130,246,0.08)' }}>
                            About <strong>${perPayment.toFixed(2)}</strong> per payment, {count} times. Each instalment
                            becomes its own invoice, so families can pay them one at a time.
                        </p>
                    )}

                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.85rem', fontSize: '0.82rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                        <input type="checkbox" checked={form.notify} onChange={(e) => setForm({ ...form, notify: e.target.checked })} />
                        Notify players when the plan is created
                    </label>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.5rem' }}>
                        Every player on the roster is billed. Leave the plan and adjust individual invoices afterwards if
                        someone needs different terms.
                    </p>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy || !form.title.trim() || total <= 0}>
                        {busy ? 'Creating…' : 'Create plan'}
                    </button>
                </div>
            </form>
        </div>
    );
}
