'use client';

import { useEffect, useRef, useState } from 'react';
import { SPORTS } from '@/lib/constants';
import { Sparkles, Copy, Check, RefreshCw, Clock, Dumbbell, ShieldCheck } from 'lucide-react';

const AGE_GROUPS = ['U6-U8', 'U9-U10', 'U11-U12', 'U13-U14', 'U15-U16', 'U17-U18', 'Adult', 'Mixed ages'];
const DURATIONS = ['30', '45', '60', '75', '90', '120'];

interface PracticePlanSection {
    name: string;
    durationMinutes: number;
    setup: string;
    instructions: string;
    coachingPoints: string[];
    progression: string;
    regression: string;
}

interface PracticePlan {
    title: string;
    overview: string;
    durationMinutes: number;
    equipment: string[];
    sections: PracticePlanSection[];
    coachNotes: string[];
    safetyNotes: string[];
}

interface UsageMeta {
    model: string;
    inputTokens: number;
    outputTokens: number;
    remainingThisMonth: number;
}

function formatPlanForCopy(plan: PracticePlan) {
    const sections = plan.sections.map((section, index) => [
        `${index + 1}. ${section.name} (${section.durationMinutes} min)`,
        `Setup: ${section.setup}`,
        `Instructions: ${section.instructions}`,
        `Coaching points: ${section.coachingPoints.join('; ')}`,
        `Progression: ${section.progression}`,
        `Regression: ${section.regression}`,
    ].join('\n')).join('\n\n');

    return [
        plan.title,
        `${plan.durationMinutes} minutes`,
        '',
        plan.overview,
        '',
        `Equipment: ${plan.equipment.join(', ') || 'None listed'}`,
        '',
        sections,
        '',
        `Coach notes:\n- ${plan.coachNotes.join('\n- ')}`,
        '',
        `Safety notes:\n- ${plan.safetyNotes.join('\n- ')}`,
    ].join('\n');
}

export default function PracticePlanPage() {
    const [form, setForm] = useState({
        sport: 'Soccer',
        duration: '60',
        skillFocus: '',
        ageGroup: 'U13-U14',
        playerCount: '',
        equipment: '',
        advanced: false,
    });
    const [plan, setPlan] = useState<PracticePlan | null>(null);
    const [usage, setUsage] = useState<UsageMeta | null>(null);
    const [generating, setGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('pp_plan');
        const savedForm = localStorage.getItem('pp_form');
        const savedUsage = localStorage.getItem('pp_usage');

        if (saved) {
            try { setPlan(JSON.parse(saved)); } catch { localStorage.removeItem('pp_plan'); }
        }
        if (savedForm) {
            try { setForm((current) => ({ ...current, ...JSON.parse(savedForm) })); } catch { localStorage.removeItem('pp_form'); }
        }
        if (savedUsage) {
            try { setUsage(JSON.parse(savedUsage)); } catch { localStorage.removeItem('pp_usage'); }
        }
    }, []);

    useEffect(() => {
        if (plan) localStorage.setItem('pp_plan', JSON.stringify(plan));
    }, [plan]);

    useEffect(() => {
        if (usage) localStorage.setItem('pp_usage', JSON.stringify(usage));
    }, [usage]);

    useEffect(() => {
        localStorage.setItem('pp_form', JSON.stringify(form));
    }, [form]);

    const generate = async () => {
        if (!form.skillFocus.trim()) {
            setError('Please enter a skill focus.');
            return;
        }

        setError(null);
        setPlan(null);
        setUsage(null);
        localStorage.removeItem('pp_plan');
        localStorage.removeItem('pp_usage');
        setGenerating(true);
        abortRef.current = new AbortController();

        try {
            const res = await fetch('/api/practice-plan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(form),
                signal: abortRef.current.signal,
            });
            const payload = await res.json();

            if (!res.ok || !payload.success) {
                setError(payload.error || 'Failed to generate plan.');
                return;
            }

            setPlan(payload.data);
            setUsage(payload.usage);
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            setError('Connection error. Please try again.');
        } finally {
            setGenerating(false);
            abortRef.current = null;
        }
    };

    const stop = () => {
        abortRef.current?.abort();
        setGenerating(false);
    };

    const copy = async () => {
        if (!plan) return;
        await navigator.clipboard.writeText(formatPlanForCopy(plan));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title page-title--gradient">Practice Plan Generator</h1>
                    <p className="page-subtitle">AI-generated sessions with structured drills, coaching points, and safety notes</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)', gap: '1.5rem', alignItems: 'start' }}>
                <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div className="form-group">
                            <label className="form-label">Sport</label>
                            <select
                                className="form-input form-select"
                                value={form.sport}
                                onChange={(e) => setForm({ ...form, sport: e.target.value })}
                            >
                                {SPORTS.map((sport) => <option key={sport} value={sport}>{sport}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Age Group</label>
                            <select
                                className="form-input form-select"
                                value={form.ageGroup}
                                onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                            >
                                {AGE_GROUPS.map((ageGroup) => <option key={ageGroup} value={ageGroup}>{ageGroup}</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Session Duration</label>
                            <select
                                className="form-input form-select"
                                value={form.duration}
                                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                            >
                                {DURATIONS.map((duration) => <option key={duration} value={duration}>{duration} minutes</option>)}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Skill Focus <span style={{ color: 'var(--danger-400)' }}>*</span></label>
                            <input
                                className="form-input"
                                placeholder="Passing under pressure"
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
                                placeholder="16"
                                value={form.playerCount}
                                onChange={(e) => setForm({ ...form, playerCount: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Available Equipment <span style={{ color: 'var(--text-tertiary)', fontWeight: 400 }}>(optional)</span></label>
                            <input
                                className="form-input"
                                placeholder="Cones, balls, pinnies, goals"
                                value={form.equipment}
                                onChange={(e) => setForm({ ...form, equipment: e.target.value })}
                            />
                        </div>

                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.85rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={form.advanced}
                                onChange={(e) => setForm({ ...form, advanced: e.target.checked })}
                                style={{ marginTop: 2 }}
                            />
                            <span>
                                <span style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700 }}>Advanced coach plan</span>
                                <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>Uses the premium model for more detailed progressions.</span>
                            </span>
                        </label>

                        {error && (
                            <div style={{ padding: '0.75rem', borderRadius: '0.5rem', background: 'rgba(239,68,68,0.1)', color: 'var(--danger-400)', fontSize: '0.85rem', lineHeight: 1.5 }}>
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

                <div>
                    {!plan && !generating && (
                        <div className="glass" style={{ padding: '3rem', borderRadius: '1rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
                            <Sparkles size={32} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
                            <p style={{ fontSize: '1rem', fontWeight: 600 }}>Build a practice plan from your coaching inputs</p>
                            <p style={{ fontSize: '0.875rem', marginTop: '0.5rem', opacity: 0.75 }}>The result is structured for quick edits, sharing, and reuse.</p>
                        </div>
                    )}

                    {generating && (
                        <div className="glass" style={{ padding: '2rem', borderRadius: '1rem', color: 'var(--text-secondary)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                <RefreshCw size={17} style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-400)' }} />
                                Generating practice plan
                            </div>
                            <p style={{ marginTop: '0.75rem', lineHeight: 1.6 }}>Creating drills, progressions, regressions, and safety notes.</p>
                        </div>
                    )}

                    {plan && !generating && (
                        <div className="glass" style={{ padding: '1.5rem', borderRadius: '1rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                                <div>
                                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>{plan.title}</h2>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginTop: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Clock size={14} /> {plan.durationMinutes} min</span>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}><Sparkles size={14} /> {usage?.model || 'AI generated'}</span>
                                        {usage && <span>{usage.remainingThisMonth} plans left this month</span>}
                                    </div>
                                </div>
                                <button className="btn btn-ghost btn-sm" onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexShrink: 0 }}>
                                    {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
                                </button>
                            </div>

                            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '1.25rem' }}>{plan.overview}</p>

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.25rem' }}>
                                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', margin: '0 0 0.75rem' }}><Dumbbell size={15} /> Equipment</h3>
                                    <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.86rem' }}>
                                        {plan.equipment.map((item) => <li key={item}>{item}</li>)}
                                    </ul>
                                </div>
                                <div style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}>
                                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', margin: '0 0 0.75rem' }}><ShieldCheck size={15} /> Safety</h3>
                                    <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.86rem' }}>
                                        {plan.safetyNotes.map((note) => <li key={note}>{note}</li>)}
                                    </ul>
                                </div>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {plan.sections.map((section, index) => (
                                    <div key={`${section.name}-${index}`} style={{ padding: '1rem', borderRadius: '0.75rem', background: 'rgba(255,255,255,0.035)', border: '1px solid var(--glass-border)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.65rem' }}>
                                            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0 }}>{index + 1}. {section.name}</h3>
                                            <span style={{ color: 'var(--primary-400)', fontSize: '0.85rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{section.durationMinutes} min</span>
                                        </div>
                                        <div style={{ display: 'grid', gap: '0.7rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.88rem' }}>
                                            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Setup:</strong> {section.setup}</p>
                                            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Instructions:</strong> {section.instructions}</p>
                                            <div>
                                                <strong style={{ color: 'var(--text-primary)' }}>Coaching points:</strong>
                                                <ul style={{ margin: '0.35rem 0 0', paddingLeft: '1.1rem' }}>
                                                    {section.coachingPoints.map((point) => <li key={point}>{point}</li>)}
                                                </ul>
                                            </div>
                                            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Progression:</strong> {section.progression}</p>
                                            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Regression:</strong> {section.regression}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div style={{ marginTop: '1.25rem', padding: '1rem', borderRadius: '0.75rem', background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.18)' }}>
                                <h3 style={{ fontSize: '0.9rem', margin: '0 0 0.6rem' }}>Coach Notes</h3>
                                <ul style={{ margin: 0, paddingLeft: '1.1rem', color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: '0.88rem' }}>
                                    {plan.coachNotes.map((note) => <li key={note}>{note}</li>)}
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                @media (max-width: 860px) {
                    .page-content > div[style*="grid-template-columns"] {
                        grid-template-columns: 1fr !important;
                    }
                }
            `}</style>
        </div>
    );
}
