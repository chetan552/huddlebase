'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PlayerProfilePage({ params }: { params: { id: string } }) {
    const { user } = useAuth();
    const router = useRouter();
    const playerId = params.id;
    const isCoach = user?.role === 'COACH' || user?.role === 'ADMIN';

    // State placeholders for MVP
    const [stats, setStats] = useState<any[]>([]);
    const [feedback, setFeedback] = useState<any[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form states
    const [statForm, setStatForm] = useState({ eventId: '', points: '', assists: '', notes: '' });
    const [feedbackForm, setFeedbackForm] = useState({ effortRating: '3', note: '' });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch stats
            const statsRes = await fetch(`/api/players/${playerId}/stats`);
            const statsData = await statsRes.json();
            if (statsData.success) setStats(statsData.data);

            // Fetch feedback
            const feedbackRes = await fetch(`/api/players/${playerId}/feedback`);
            const feedbackData = await feedbackRes.json();
            if (feedbackData.success) setFeedback(feedbackData.data);

            // Fetch events to populate the dropdown for recording new stats
            const eventsRes = await fetch('/api/events');
            const eventsData = await eventsRes.json();
            if (eventsData.success) setEvents(eventsData.data);
        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [playerId]);

    const handleStatSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const metrics = { points: parseInt(statForm.points || '0'), assists: parseInt(statForm.assists || '0') };
            const res = await fetch(`/api/players/${playerId}/stats`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: statForm.eventId, metrics, notes: statForm.notes }),
            });
            if (res.ok) {
                setStatForm({ eventId: '', points: '', assists: '', notes: '' });
                fetchData();
            }
        } catch (error) { console.error(error); }
    };

    const handleFeedbackSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch(`/api/players/${playerId}/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(feedbackForm),
            });
            if (res.ok) {
                setFeedbackForm({ effortRating: '3', note: '' });
                fetchData();
            }
        } catch (error) { console.error(error); }
    };

    return (
        <div className="page-content">
            <div className="page-header" style={{ marginBottom: '1rem' }}>
                <div>
                    <Link href="/roster" style={{ color: 'var(--primary-400)', textDecoration: 'none', fontSize: '0.85rem' }}>← Back to Roster</Link>
                    <h1 className="page-title" style={{ marginTop: '0.5rem' }}>Player Profile</h1>
                    <p className="page-subtitle">Track stats, progress, and provide feedback</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>

                {/* Left Column: History */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="card">
                        <h2 className="card-title">Recent Stats</h2>
                        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : stats.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No stats recorded yet.</p> : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--surface-600)', textAlign: 'left' }}>
                                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Date</th>
                                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Event</th>
                                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Points</th>
                                        <th style={{ padding: '0.75rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Assists</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stats.map(stat => (
                                        <tr key={stat.id} style={{ borderBottom: '1px solid var(--surface-700)' }}>
                                            <td style={{ padding: '0.75rem' }}>{new Date(stat.event.startTime).toLocaleDateString()}</td>
                                            <td style={{ padding: '0.75rem' }}>{stat.event.title}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{stat.metrics.points}</td>
                                            <td style={{ padding: '0.75rem', fontWeight: 'bold' }}>{stat.metrics.assists}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="card">
                        <h2 className="card-title">Coach Feedback</h2>
                        {loading ? <p style={{ color: 'var(--text-secondary)' }}>Loading...</p> : feedback.length === 0 ? <p style={{ color: 'var(--text-secondary)' }}>No feedback recorded yet.</p> : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                {feedback.map(f => (
                                    <div key={f.id} style={{ padding: '1rem', background: 'var(--surface-700)', borderRadius: '0.5rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div style={{ fontWeight: 'bold' }}>{f.coach.name}</div>
                                            <div style={{ background: 'var(--primary-800)', color: 'var(--primary-300)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                Effort: {f.effortRating}/5
                                            </div>
                                        </div>
                                        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>"{f.note}"</p>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                            {new Date(f.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Coach Input Forms */}
                {isCoach && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="card">
                            <h2 className="card-title">Record Game Stats</h2>
                            <form onSubmit={handleStatSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Select Event</label>
                                    <select className="form-input" required value={statForm.eventId} onChange={e => setStatForm({ ...statForm, eventId: e.target.value })}>
                                        <option value="">-- Choose game/practice --</option>
                                        {events.map((ev: any) => (
                                            <option key={ev.id} value={ev.id}>{new Date(ev.startTime).toLocaleDateString()} - {ev.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                    <div className="form-group">
                                        <label className="form-label">Points</label>
                                        <input type="number" min="0" className="form-input" value={statForm.points} onChange={e => setStatForm({ ...statForm, points: e.target.value })} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label">Assists</label>
                                        <input type="number" min="0" className="form-input" value={statForm.assists} onChange={e => setStatForm({ ...statForm, assists: e.target.value })} />
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Notes (Optional)</label>
                                    <input className="form-input" placeholder="e.g., Great defense in Q4" value={statForm.notes} onChange={e => setStatForm({ ...statForm, notes: e.target.value })} />
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Save Stats</button>
                            </form>
                        </div>

                        <div className="card">
                            <h2 className="card-title">Provide Feedback</h2>
                            <form onSubmit={handleFeedbackSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                <div className="form-group">
                                    <label className="form-label">Effort Rating (1-5)</label>
                                    <select className="form-input" value={feedbackForm.effortRating} onChange={e => setFeedbackForm({ ...feedbackForm, effortRating: e.target.value })}>
                                        <option value="1">1 - Poor</option>
                                        <option value="2">2 - Below Average</option>
                                        <option value="3">3 - Average</option>
                                        <option value="4">4 - Good</option>
                                        <option value="5">5 - Excellent</option>
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Development Note</label>
                                    <textarea className="form-input" required rows={4} placeholder="What should they focus on? What did they do well?" value={feedbackForm.note} onChange={e => setFeedbackForm({ ...feedbackForm, note: e.target.value })} style={{ resize: 'vertical' }}></textarea>
                                </div>
                                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>Submit Feedback</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
