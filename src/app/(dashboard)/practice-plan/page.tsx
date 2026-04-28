'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { SPORTS } from '@/lib/constants';
import { Sparkles, Copy, Check, RefreshCw } from 'lucide-react';

const AGE_GROUPS = ['U6–U8', 'U9–U10', 'U11–U12', 'U13–U14', 'U15–U16', 'U17–U18', 'Adult', 'Mixed ages'];
const DURATIONS = ['30', '45', '60', '75', '90', '120'];

export default function PracticePlanPage() {
    const { user } = useAuth();
    const [form, setForm] = useState({
        sport: 'Soccer',
        duration: '60',
        skillFocus: '',
        ageGroup: 'U13–U14',
        playerCount: '',
    });
    const [plan, setPlan] = useState('');
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('pp_plan');
        const savedForm = localStorage.getItem('pp_form');
        if (saved) setPlan(saved);
        if (savedForm) { try { setForm(JSON.parse(savedForm)); } catch { /* ignore */ } }
    }, []);

    useEffect(() => { if (plan) localStorage.setItem('pp_plan', plan); }, [plan]);
    useEffect(() => { localStorage.setItem('pp_form', JSON.stringify(form)); }, [form]);

    const generate = async () => {
        if (!form.skillFocus.trim()) {
            setError('Please enter a skill focus.');
            return;
        }
        setError(null);
        setPlan('');
        localStorage.removeItem('pp_plan');
        setGenerating(true);

        abortRef.current = new AbortController();

        try {
            const res = await fetch('/api/practice-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
                signal: abortRef.current.signal,
            });

            if (!res.ok) {
                const err = await res.json();
                setError(err.error || 'Failed to generate plan.');
                setGenerating(false);
                return;
            }

            const reader = res.body!.getReader();
            const decoder = new TextDecoder();
            let text = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                text += decoder.decode(value, { stream: true });
                setPlan(text);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setError('Connection error. Please try again.');
            }
        } finally {
            setGenerating(false);
        }
    };

    const stop = () => {
        abortRef.current?.abort();
        setGenerating(false);
    };

    const copy = async () => {
        await navigator.clipboard.writeText(plan);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Simple markdown-to-JSX renderer for headings, bold, bullets
    const renderPlan = (text: string) => {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            if (line.startsWith('## ')) {
                return <h2 key={i} style={{ fontSize: '1.1rem', fontWeight: 700, marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary-400)' }}>{line.slice(3)}</h2>;
            }
            if (line.startsWith('### ')) {
                return <h3 key={i} style={{ fontSize: '0.95rem', fontWeight: 700, marginTop: '1rem', marginBottom: '0.25rem', color: 'var(--text-primary)' }}>{line.slice(4)}</h3>;
            }
            if (line.startsWith('- **') || line.startsWith('- *')) {
                const content = line.slice(2);
                return <li key={i} style={{ marginBottom: '0.375rem', lineHeight: 1.6 }}>{renderInline(content)}</li>;
            }
            if (line.startsWith('- ')) {
                return <li key={i} style={{ marginBottom: '0.25rem', lineHeight: 1.6 }}>{line.slice(2)}</li>;
            }
            if (line.startsWith('  - ')) {
                return <li key={i} style={{ marginLeft: '1.25rem', marginBottom: '0.25rem', lineHeight: 1.6, listStyleType: 'circle' }}>{renderInline(line.slice(4))}</li>;
            }
            if (line.trim() === '') {
                return <div key={i} style={{ height: '0.5rem' }} />;
            }
            return <p key={i} style={{ lineHeight: 1.7, marginBottom: '0.25rem' }}>{renderInline(line)}</p>;
        });
    };

    const renderInline = (text: string) => {
        const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
        return parts.map((part, i) => {
            if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={i}>{part.slice(2, -2)}</strong>;
            }
            if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={i} style={{ color: 'var(--text-secondary)' }}>{part.slice(1, -1)}</em>;
            }
            return part;
        });
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title page-title--gradient">Practice Plan Generator</h1>
                    <p className="page-subtitle">AI-generated practice plans tailored to your team</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '1.5rem', alignItems: 'start' }}>

                {/* Form */}
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Sport</label>
                            <select
                                className="form-input form-select"
                                value={form.sport}
                                onChange={(e) => setForm({ ...form, sport: e.target.value })}
                            >
                                {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Age Group</label>
                            <select
                                className="form-input form-select"
                                value={form.ageGroup}
                                onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                            >
                                {AGE_GROUPS.map((a) => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Session Duration</label>
                            <select
                                className="form-input form-select"
                                value={form.duration}
                                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                            >
                                {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Skill Focus <span style={{ color: 'var(--danger-400)' }}>*</span></label>
                            <input
                                className="form-input"
                                placeholder="e.g. Passing under pressure"
                                value={form.skillFocus}
                                onChange={(e) => setForm({ ...form, skillFocus: e.target.value })}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !generating) generate(); }}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Number of Players <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                            <input
                                className="form-input"
                                type="number"
                                min="2"
                                max="50"
                                placeholder="e.g. 16"
                                value={form.playerCount}
                                onChange={(e) => setForm({ ...form, playerCount: e.target.value })}
                            />
                        </div>

                        {error && (
                            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-400)', fontSize: '0.85rem' }}>
                                {error}
                            </div>
                        )}

                        {generating ? (
                            <button className="btn btn-ghost" onClick={stop} style={{ justifyContent: 'center' }}>
                                <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite' }} /> Stop
                            </button>
                        ) : (
                            <button
                                className="btn btn-primary"
                                onClick={generate}
                                style={{ justifyContent: 'center', gap: '0.5rem' }}
                            >
                                <Sparkles size={15} />
                                {plan ? 'Regenerate' : 'Generate Plan'}
                            </button>
                        )}
                    </div>
                </div>

                {/* Output */}
                <div>
                    {!plan && !generating && (
                        <div className="glass" style={{ padding: '3rem', borderRadius: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <Sparkles size={32} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                            <p style={{ fontSize: '1rem', fontWeight: 500 }}>Fill in the form and click Generate</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.7 }}>Your practice plan will appear here</p>
                        </div>
                    )}

                    {(plan || generating) && (
                        <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                                    {generating ? (
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <RefreshCw size={15} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-400)' }} />
                                            Generating…
                                        </span>
                                    ) : (
                                        `${form.sport} Practice Plan — ${form.duration} min`
                                    )}
                                </h2>
                                {plan && !generating && (
                                    <button className="btn btn-ghost btn-sm" onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                                        {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                                    </button>
                                )}
                            </div>

                            <div style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>
                                <ul style={{ paddingLeft: '1.25rem', margin: 0 }}>
                                    {renderPlan(plan)}
                                </ul>
                            </div>

                            {generating && (
                                <div style={{ marginTop: '1rem', display: 'flex', gap: '4px' }}>
                                    {[0, 1, 2].map((i) => (
                                        <div key={i} style={{
                                            width: 6, height: 6, borderRadius: '50%',
                                            background: 'var(--primary-400)',
                                            animation: `bounce 1s ${i * 0.2}s infinite`,
                                        }} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }
            `}</style>
        </div>
    );
}
