'use client';

import { useState, useEffect, use } from 'react';
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface FormField {
    id: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
    helpText?: string;
}

interface PublicForm {
    title: string;
    description: string | null;
    season: string | null;
    teamName: string;
    teamColor: string;
    sport: string;
    fields: FormField[];
    feeAmount: number | null;
    feeTitle: string | null;
    waiverTitle: string | null;
    waiverText: string | null;
    isOpen: boolean;
    closedReason: string | null;
}

/**
 * Public registration form.
 *
 * Reachable without an account — the token in the URL is the capability — so a
 * family can sign up before they've been added to the team.
 */
export default function PublicRegistrationPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = use(params);
    const [form, setForm] = useState<PublicForm | null>(null);
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [submitted, setSubmitted] = useState<{ requiresPayment: boolean; feeHandledSeparately: boolean } | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const [playerName, setPlayerName] = useState('');
    const [playerEmail, setPlayerEmail] = useState('');
    const [answers, setAnswers] = useState<Record<string, unknown>>({});
    const [signedName, setSignedName] = useState('');

    useEffect(() => {
        (async () => {
            try {
                const res = await fetch(`/api/registration/public/${token}`);
                const data = await res.json();
                if (data.success) setForm(data.data);
                else setNotFound(true);
            } catch {
                setNotFound(true);
            }
            setLoading(false);
        })();
    }, [token]);

    const setAnswer = (fieldId: string, value: unknown) => {
        setAnswers((prev) => ({ ...prev, [fieldId]: value }));
    };

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
            const res = await fetch(`/api/registration/public/${token}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ playerName, playerEmail, answers, signedName }),
            });
            const data = await res.json();
            if (data.success) setSubmitted(data.data);
            else setError(data.error || 'Could not submit your registration.');
        } catch {
            setError('Something went wrong. Please try again.');
        }
        setBusy(false);
    };

    if (loading) {
        return (
            <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
                <Loader2 className="animate-spin" size={28} color="var(--primary-400)" />
            </div>
        );
    }

    if (notFound || !form) {
        return (
            <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
                <div className="auth-card" style={{ textAlign: 'center', maxWidth: 420 }}>
                    <AlertCircle size={36} color="var(--danger-400)" style={{ margin: '0 auto 1rem' }} />
                    <h1 className="auth-title">Form not found</h1>
                    <p className="auth-subtitle">
                        This registration link is not valid. Check with your coach for an up-to-date link.
                    </p>
                </div>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
                <div className="auth-card" style={{ textAlign: 'center', maxWidth: 460 }}>
                    <CheckCircle2 size={40} color="var(--success-400)" style={{ margin: '0 auto 1rem' }} />
                    <h1 className="auth-title">You&apos;re registered</h1>
                    <p className="auth-subtitle">
                        Thanks — {playerName} has been registered for {form.title}. Your coach will be in touch.
                    </p>
                    {submitted.requiresPayment && (
                        <div className="form-success" style={{ marginTop: '1rem', textAlign: 'left' }}>
                            {submitted.feeHandledSeparately
                                ? `A ${form.feeTitle || 'registration'} fee of $${form.feeAmount?.toFixed(2)} applies. Your coach will send an invoice once your account is set up.`
                                : `An invoice for $${form.feeAmount?.toFixed(2)} has been added to your account. You can pay it from the Payments page.`}
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (!form.isOpen) {
        return (
            <div className="auth-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: '1.5rem' }}>
                <div className="auth-card" style={{ textAlign: 'center', maxWidth: 420 }}>
                    <AlertCircle size={36} color="var(--warning-400)" style={{ margin: '0 auto 1rem' }} />
                    <h1 className="auth-title">{form.title}</h1>
                    <p className="auth-subtitle">{form.closedReason ?? 'This form is not accepting registrations right now.'}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
            <div style={{ maxWidth: 620, margin: '0 auto' }}>
                <div className="auth-card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
                        <div style={{
                            width: 44, height: 44, borderRadius: '0.75rem', background: form.teamColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: '1.1rem', flexShrink: 0,
                        }}>
                            {form.teamName.charAt(0)}
                        </div>
                        <div>
                            <h1 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{form.title}</h1>
                            <p style={{ fontSize: '0.82rem', color: 'var(--text-tertiary)' }}>
                                {form.teamName} · {form.sport}{form.season ? ` · ${form.season}` : ''}
                            </p>
                        </div>
                    </div>

                    {form.description && (
                        <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                            {form.description}
                        </p>
                    )}

                    {form.feeAmount && form.feeAmount > 0 && (
                        <div className="form-success" style={{ marginBottom: '1.25rem' }}>
                            <strong>{form.feeTitle || 'Registration fee'}:</strong> ${form.feeAmount.toFixed(2)} — invoiced after you register.
                        </div>
                    )}

                    <form onSubmit={submit} className="auth-form">
                        {error && <div className="auth-error">{error}</div>}

                        <div className="form-group">
                            <label className="form-label">Player name <span style={{ color: 'var(--danger-400)' }}>*</span></label>
                            <input className="form-input" required value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="Who is registering?" />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Contact email</label>
                            <input className="form-input" type="email" value={playerEmail} onChange={(e) => setPlayerEmail(e.target.value)} placeholder="you@example.com" />
                        </div>

                        {form.fields.map((field) => (
                            <div className="form-group" key={field.id}>
                                <label className="form-label">
                                    {field.label}
                                    {field.required && <span style={{ color: 'var(--danger-400)' }}> *</span>}
                                </label>

                                {field.type === 'TEXTAREA' ? (
                                    <textarea
                                        className="form-textarea"
                                        rows={3}
                                        required={field.required}
                                        value={String(answers[field.id] ?? '')}
                                        onChange={(e) => setAnswer(field.id, e.target.value)}
                                    />
                                ) : field.type === 'SELECT' ? (
                                    <select
                                        className="form-select"
                                        required={field.required}
                                        value={String(answers[field.id] ?? '')}
                                        onChange={(e) => setAnswer(field.id, e.target.value)}
                                    >
                                        <option value="">Select…</option>
                                        {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
                                    </select>
                                ) : field.type === 'MULTISELECT' ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        {field.options?.map((o) => {
                                            const current = Array.isArray(answers[field.id]) ? (answers[field.id] as string[]) : [];
                                            return (
                                                <label key={o} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={current.includes(o)}
                                                        onChange={(e) => setAnswer(
                                                            field.id,
                                                            e.target.checked ? [...current, o] : current.filter((v) => v !== o),
                                                        )}
                                                    />
                                                    {o}
                                                </label>
                                            );
                                        })}
                                    </div>
                                ) : field.type === 'CHECKBOX' ? (
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                                        <input
                                            type="checkbox"
                                            checked={answers[field.id] === true}
                                            onChange={(e) => setAnswer(field.id, e.target.checked)}
                                        />
                                        Yes
                                    </label>
                                ) : (
                                    <input
                                        className="form-input"
                                        type={field.type === 'NUMBER' ? 'number' : field.type === 'EMAIL' ? 'email'
                                            : field.type === 'DATE' ? 'date' : field.type === 'PHONE' ? 'tel' : 'text'}
                                        required={field.required}
                                        value={String(answers[field.id] ?? '')}
                                        onChange={(e) => setAnswer(field.id, e.target.value)}
                                    />
                                )}

                                {field.helpText && (
                                    <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.3rem' }}>{field.helpText}</p>
                                )}
                            </div>
                        ))}

                        {form.waiverText && (
                            <div className="form-group">
                                <label className="form-label">{form.waiverTitle || 'Waiver'} <span style={{ color: 'var(--danger-400)' }}>*</span></label>
                                <div style={{
                                    maxHeight: 180, overflowY: 'auto', padding: '0.85rem',
                                    borderRadius: 'var(--radius-md)', background: 'rgba(148,163,184,0.06)',
                                    border: '1px solid rgba(148,163,184,0.12)', fontSize: '0.8rem',
                                    lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap',
                                    marginBottom: '0.65rem',
                                }}>
                                    {form.waiverText}
                                </div>
                                <input
                                    className="form-input"
                                    required
                                    placeholder="Type your full name to sign"
                                    value={signedName}
                                    onChange={(e) => setSignedName(e.target.value)}
                                />
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)', marginTop: '0.35rem' }}>
                                    Typing your name above is a legally binding electronic signature. The date and time are recorded.
                                </p>
                            </div>
                        )}

                        <button type="submit" className="btn btn-primary btn-lg" disabled={busy} style={{ width: '100%' }}>
                            {busy ? 'Submitting…' : 'Complete registration'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
