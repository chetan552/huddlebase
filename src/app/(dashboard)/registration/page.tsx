'use client';

import { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, X, Copy, Check, Trash2, GripVertical, ExternalLink, Users } from 'lucide-react';

interface FormField {
    id: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    helpText?: string;
}

interface RegistrationForm {
    id: string;
    teamId: string;
    teamName: string;
    title: string;
    description: string | null;
    season: string | null;
    fields: FormField[];
    feeAmount: number | null;
    feeTitle: string | null;
    waiverTitle: string | null;
    waiverText: string | null;
    status: string;
    isOpen: boolean;
    closedReason: string | null;
    submissionCount: number;
    publicUrl: string | null;
    canManage: boolean;
}

interface Submission {
    id: string;
    playerName: string;
    playerEmail: string | null;
    answers: Record<string, unknown>;
    status: string;
    signedName: string | null;
    signedAt: string | null;
    invoiceStatus: string | null;
    invoiceAmount: number | null;
    createdAt: string;
}

interface Team { id: string; name: string }

const FIELD_TYPES = [
    { value: 'TEXT', label: 'Short text' },
    { value: 'TEXTAREA', label: 'Long text' },
    { value: 'NUMBER', label: 'Number' },
    { value: 'EMAIL', label: 'Email' },
    { value: 'PHONE', label: 'Phone' },
    { value: 'DATE', label: 'Date' },
    { value: 'SELECT', label: 'Dropdown' },
    { value: 'MULTISELECT', label: 'Multi-select' },
    { value: 'CHECKBOX', label: 'Checkbox' },
];

const STATUS_COLOR: Record<string, string> = {
    SUBMITTED: '#3b82f6',
    APPROVED: '#10b981',
    REJECTED: '#ef4444',
    WAITLISTED: '#f59e0b',
};

export default function RegistrationPage() {
    const [forms, setForms] = useState<RegistrationForm[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [loading, setLoading] = useState(true);
    const [showBuilder, setShowBuilder] = useState(false);
    const [openFormId, setOpenFormId] = useState<string | null>(null);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            const [formsRes, teamsRes] = await Promise.all([
                fetch('/api/registration'),
                fetch('/api/teams'),
            ]);
            const formsData = await formsRes.json();
            const teamsData = await teamsRes.json();
            if (formsData.success) setForms(formsData.data);
            if (teamsData.success) setTeams(teamsData.data);
        } catch { /* empty state covers it */ }
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const copyLink = async (form: RegistrationForm) => {
        if (!form.publicUrl) return;
        try {
            await navigator.clipboard.writeText(form.publicUrl);
            setCopiedId(form.id);
            setTimeout(() => setCopiedId(null), 2000);
        } catch { /* clipboard unavailable */ }
    };

    const setStatus = async (form: RegistrationForm, status: string) => {
        setForms((prev) => prev.map((f) => (f.id === form.id ? { ...f, status } : f)));
        try {
            await fetch(`/api/registration/${form.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            load();
        } catch { load(); }
    };

    if (loading) {
        return <div className="page-content"><div className="card"><div className="skeleton" style={{ height: 120 }} /></div></div>;
    }

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title page-title--gradient">Registration</h1>
                    <p className="page-subtitle">Season signup forms, waivers and fees</p>
                </div>
                {teams.length > 0 && (
                    <button className="btn btn-primary" onClick={() => setShowBuilder(true)}>
                        <Plus size={16} /> New form
                    </button>
                )}
            </div>

            {forms.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon"><FileText /></div>
                    <h3 className="empty-state__title">No registration forms</h3>
                    <p className="empty-state__description">
                        Build a signup form with custom questions, an e-signed waiver and an optional fee.
                        Share the link and families can register without needing an account first.
                    </p>
                    {teams.length > 0 && (
                        <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setShowBuilder(true)}>
                            <Plus size={16} /> Create a form
                        </button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {forms.map((form) => (
                        <div key={form.id} className="card">
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: 200 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                                        <h2 style={{ fontSize: '1.05rem', fontWeight: 700 }}>{form.title}</h2>
                                        <span className="badge" style={{
                                            background: form.status === 'OPEN' ? 'rgba(16,185,129,0.15)'
                                                : form.status === 'DRAFT' ? 'rgba(148,163,184,0.15)' : 'rgba(239,68,68,0.15)',
                                            color: form.status === 'OPEN' ? '#10b981'
                                                : form.status === 'DRAFT' ? 'var(--text-tertiary)' : '#ef4444',
                                        }}>
                                            {form.status}
                                        </span>
                                    </div>
                                    <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)', marginTop: '0.2rem' }}>
                                        {form.teamName}
                                        {form.season ? ` · ${form.season}` : ''}
                                        {' · '}{form.fields.length} question{form.fields.length === 1 ? '' : 's'}
                                        {form.feeAmount ? ` · $${form.feeAmount.toFixed(2)} fee` : ''}
                                        {form.waiverText ? ' · waiver' : ''}
                                    </p>
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '0.35rem',
                                        padding: '0.3rem 0.6rem', borderRadius: 'var(--radius-md)',
                                        background: 'rgba(59,130,246,0.1)', color: 'var(--primary-400)',
                                        fontSize: '0.8rem', fontWeight: 600,
                                    }}>
                                        <Users size={14} /> {form.submissionCount}
                                    </div>

                                    {form.canManage && (
                                        <>
                                            <button className="btn btn-ghost btn-sm" onClick={() => copyLink(form)}>
                                                {copiedId === form.id ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Link</>}
                                            </button>
                                            <select
                                                className="form-select"
                                                value={form.status}
                                                onChange={(e) => setStatus(form, e.target.value)}
                                                style={{ width: 'auto', fontSize: '0.8rem', padding: '0.35rem 0.5rem' }}
                                            >
                                                <option value="DRAFT">Draft</option>
                                                <option value="OPEN">Open</option>
                                                <option value="CLOSED">Closed</option>
                                            </select>
                                            <button
                                                className="btn btn-outline btn-sm"
                                                onClick={() => setOpenFormId(openFormId === form.id ? null : form.id)}
                                            >
                                                {openFormId === form.id ? 'Hide' : 'Submissions'}
                                            </button>
                                        </>
                                    )}
                                    {form.publicUrl && form.status === 'OPEN' && (
                                        <a className="btn btn-ghost btn-sm" href={form.publicUrl} target="_blank" rel="noopener noreferrer">
                                            <ExternalLink size={14} />
                                        </a>
                                    )}
                                </div>
                            </div>

                            {openFormId === form.id && <SubmissionsPanel formId={form.id} fields={form.fields} />}
                        </div>
                    ))}
                </div>
            )}

            {showBuilder && (
                <FormBuilder
                    teams={teams}
                    onClose={() => setShowBuilder(false)}
                    onCreated={() => { setShowBuilder(false); load(); }}
                />
            )}
        </div>
    );
}

function SubmissionsPanel({ formId, fields }: { formId: string; fields: FormField[] }) {
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/registration/${formId}`);
            const data = await res.json();
            if (data.success) setSubmissions(data.data.submissions);
        } catch { /* handled by empty state */ }
        setLoading(false);
    }, [formId]);

    useEffect(() => { load(); }, [load]);

    const review = async (id: string, status: string) => {
        setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
        try {
            await fetch(`/api/registration/submissions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
        } catch { load(); }
    };

    if (loading) return <div className="skeleton" style={{ height: 60, marginTop: '1rem' }} />;

    if (submissions.length === 0) {
        return (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(148,163,184,0.1)' }}>
                No submissions yet. Share the form link to start collecting registrations.
            </p>
        );
    }

    return (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid rgba(148,163,184,0.1)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {submissions.map((s) => (
                    <div key={s.id} style={{
                        padding: '0.75rem', borderRadius: 'var(--radius-md)',
                        background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.08)',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: 160 }}>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{s.playerName}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
                                    {s.playerEmail ?? 'No email'}
                                    {s.signedName ? ` · signed by ${s.signedName}` : ''}
                                    {s.invoiceStatus ? ` · fee ${s.invoiceStatus.toLowerCase()}` : ''}
                                </div>
                            </div>
                            <span className="badge" style={{
                                background: `${STATUS_COLOR[s.status] ?? '#64748b'}22`,
                                color: STATUS_COLOR[s.status] ?? 'var(--text-secondary)',
                            }}>
                                {s.status}
                            </span>
                            <div style={{ display: 'flex', gap: '0.3rem' }}>
                                <button className="btn btn-ghost btn-sm" onClick={() => review(s.id, 'APPROVED')}>Approve</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => review(s.id, 'WAITLISTED')}>Waitlist</button>
                                <button className="btn btn-ghost btn-sm" onClick={() => review(s.id, 'REJECTED')}>Decline</button>
                            </div>
                        </div>

                        {fields.length > 0 && (
                            <div style={{ marginTop: '0.6rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.4rem' }}>
                                {fields.map((f) => {
                                    const value = s.answers[f.id];
                                    if (value === undefined || value === null || value === '') return null;
                                    const display = Array.isArray(value) ? value.join(', ')
                                        : typeof value === 'boolean' ? (value ? 'Yes' : 'No')
                                        : String(value);
                                    return (
                                        <div key={f.id} style={{ fontSize: '0.75rem' }}>
                                            <span style={{ color: 'var(--text-tertiary)' }}>{f.label}: </span>
                                            <span style={{ color: 'var(--text-secondary)' }}>{display}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function FormBuilder({ teams, onClose, onCreated }: { teams: Team[]; onClose: () => void; onCreated: () => void }) {
    const [form, setForm] = useState({
        teamId: teams[0]?.id ?? '',
        title: '',
        description: '',
        season: '',
        feeAmount: '',
        feeTitle: '',
        waiverTitle: '',
        waiverText: '',
        status: 'DRAFT',
    });
    const [fields, setFields] = useState<FormField[]>([
        { id: 'tmp1', label: 'Date of birth', type: 'DATE', required: true },
        { id: 'tmp2', label: 'Emergency contact phone', type: 'PHONE', required: true },
    ]);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const addField = () => {
        setFields((prev) => [...prev, { id: `tmp${Date.now()}`, label: '', type: 'TEXT', required: false }]);
    };

    const updateField = (index: number, patch: Partial<FormField>) => {
        setFields((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (fields.some((f) => !f.label.trim())) {
            setError('Every question needs a label.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...form,
                    feeAmount: form.feeAmount || null,
                    // Strip the temporary client ids; the server assigns stable ones.
                    fields: fields.map(({ label, type, required, options, helpText }) => ({
                        label, type, required, options, helpText,
                    })),
                }),
            });
            const data = await res.json();
            if (data.success) onCreated();
            else setError(data.error || 'Could not create that form.');
        } catch {
            setError('Something went wrong. Try again.');
        }
        setBusy(false);
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit} style={{ maxWidth: 620, maxHeight: '90vh', overflowY: 'auto' }}>
                <div className="modal-header">
                    <h3 className="modal-title">New registration form</h3>
                    <button type="button" onClick={onClose} className="btn btn-ghost btn-sm" aria-label="Close"><X size={16} /></button>
                </div>
                <div className="modal-body">
                    {error && <div className="form-error" style={{ marginBottom: '0.75rem' }}>{error}</div>}

                    <div className="modal-form-row">
                        <div className="form-group">
                            <label className="form-label">Team</label>
                            <select className="form-select" value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })} required>
                                {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Season</label>
                            <input className="form-input" placeholder="e.g. Fall 2026" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Title</label>
                        <input className="form-input" required placeholder="e.g. Fall 2026 Registration" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Description <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                        <textarea className="form-textarea" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>

                    <div style={{ margin: '1.25rem 0 0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label className="form-label" style={{ margin: 0 }}>Questions</label>
                        <button type="button" className="btn btn-ghost btn-sm" onClick={addField}><Plus size={14} /> Add</button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {fields.map((field, index) => (
                            <div key={field.id} style={{
                                padding: '0.65rem', borderRadius: 'var(--radius-md)',
                                background: 'rgba(148,163,184,0.05)', border: '1px solid rgba(148,163,184,0.1)',
                            }}>
                                <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                    <GripVertical size={14} color="var(--text-tertiary)" style={{ flexShrink: 0 }} />
                                    <input
                                        className="form-input"
                                        placeholder="Question"
                                        value={field.label}
                                        onChange={(e) => updateField(index, { label: e.target.value })}
                                        style={{ flex: 1, fontSize: '0.85rem' }}
                                    />
                                    <select
                                        className="form-select"
                                        value={field.type}
                                        onChange={(e) => updateField(index, { type: e.target.value, options: undefined })}
                                        style={{ width: 'auto', fontSize: '0.8rem' }}
                                    >
                                        {FIELD_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={() => setFields((prev) => prev.filter((_, i) => i !== index))}
                                        aria-label="Remove question"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>

                                {(field.type === 'SELECT' || field.type === 'MULTISELECT') && (
                                    <input
                                        className="form-input"
                                        placeholder="Options, comma separated (e.g. Small, Medium, Large)"
                                        value={field.options?.join(', ') ?? ''}
                                        onChange={(e) => updateField(index, {
                                            options: e.target.value.split(',').map((o) => o.trim()).filter(Boolean),
                                        })}
                                        style={{ marginTop: '0.4rem', fontSize: '0.8rem' }}
                                    />
                                )}

                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                                    <input type="checkbox" checked={field.required} onChange={(e) => updateField(index, { required: e.target.checked })} />
                                    Required
                                </label>
                            </div>
                        ))}
                    </div>

                    <div className="modal-form-row" style={{ marginTop: '1.25rem' }}>
                        <div className="form-group">
                            <label className="form-label">Fee <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                            <input className="form-input" type="number" min="0" step="0.01" placeholder="0.00" value={form.feeAmount} onChange={(e) => setForm({ ...form, feeAmount: e.target.value })} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Fee label</label>
                            <input className="form-input" placeholder="e.g. Season fee" value={form.feeTitle} onChange={(e) => setForm({ ...form, feeTitle: e.target.value })} />
                        </div>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '-0.5rem', marginBottom: '1rem' }}>
                        A fee creates an invoice for registrants who are signed in. Anonymous signups are invoiced by you
                        once the player is added to the roster.
                    </p>

                    <div className="form-group">
                        <label className="form-label">Waiver title <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                        <input className="form-input" placeholder="e.g. Liability waiver" value={form.waiverTitle} onChange={(e) => setForm({ ...form, waiverTitle: e.target.value })} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Waiver text</label>
                        <textarea
                            className="form-textarea"
                            rows={4}
                            placeholder="Paste the waiver families must agree to. They'll type their name to sign."
                            value={form.waiverText}
                            onChange={(e) => setForm({ ...form, waiverText: e.target.value })}
                        />
                        <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
                            The exact wording is stored with each signature, so later edits don&apos;t change what was agreed.
                        </p>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Publish</label>
                        <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                            <option value="DRAFT">Save as draft</option>
                            <option value="OPEN">Open for registration</option>
                        </select>
                    </div>
                </div>
                <div className="modal-footer">
                    <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={busy || !form.title.trim()}>
                        {busy ? 'Creating…' : 'Create form'}
                    </button>
                </div>
            </form>
        </div>
    );
}
