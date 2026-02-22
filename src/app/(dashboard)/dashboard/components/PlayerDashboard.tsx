'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Event {
    id: string; title: string; type: string; startTime: string; location: string | null; teamName: string; teamColor: string;
}

interface DashboardData {
    announcements: Array<{ id: string; title: string; content: string; date: string }>;
}

export default function PlayerDashboard({ user }: { user: any }) {
    const [nextEvent, setNextEvent] = useState<Event | null>(null);
    const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
    const [stats, setStats] = useState<any[]>([]);
    const [feedback, setFeedback] = useState<any[]>([]);
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch Initial Data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch Announcements mapped to the traditional Dashboard Data
                const dashRes = await fetch('/api/dashboard');
                const dashData = await dashRes.json();
                if (dashData.success) setDashboardData(dashData.data);

                // Fetch Events to find Next Event
                const eventsRes = await fetch('/api/events');
                const eventsData = await eventsRes.json();
                if (eventsData.success) {
                    const now = new Date();
                    const futureEvents = eventsData.data
                        .filter((e: Event) => new Date(e.startTime) > now)
                        .sort((a: Event, b: Event) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

                    if (futureEvents.length > 0) {
                        setNextEvent(futureEvents[0]);
                    }
                }

                // Fetch Stats & Feedback
                const statsRes = await fetch(`/api/players/${user.id}/stats`);
                const statsData = await statsRes.json();
                if (statsData.success) setStats(statsData.data);

                const fbRes = await fetch(`/api/players/${user.id}/feedback`);
                const fbData = await fbRes.json();
                if (fbData.success) setFeedback(fbData.data);

            } catch (err) {
                console.error('Failed to load player dashboard data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    // Countdown Timer Logic
    useEffect(() => {
        if (!nextEvent) return;

        const calculateTimeLeft = () => {
            const difference = new Date(nextEvent.startTime).getTime() - new Date().getTime();
            if (difference > 0) {
                setTimeLeft({
                    d: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    h: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    m: Math.floor((difference / 1000 / 60) % 60),
                    s: Math.floor((difference / 1000) % 60),
                });
            } else {
                setTimeLeft(null); // Event passed
            }
        };

        calculateTimeLeft(); // Initial calc
        const timer = setInterval(calculateTimeLeft, 1000);
        return () => clearInterval(timer);
    }, [nextEvent]);
    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Ready to play, {user?.name?.split(' ')[0]}? 🏅
                    </h1>
                    <p className="page-subtitle">Your team stats, schedule, and next matchup.</p>
                </div>
            </div>

            <div className="card" style={{ marginTop: '2rem', textAlign: 'center', padding: '3rem' }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏱️</div>
                {loading ? (
                    <p style={{ color: 'var(--text-secondary)' }}>Loading schedule...</p>
                ) : nextEvent && timeLeft ? (
                    <>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, fontFamily: 'monospace' }}>
                            {timeLeft.d}d {timeLeft.h}h {timeLeft.m}m {timeLeft.s}s
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>
                            Until {nextEvent.title} vs. {nextEvent.teamName}
                        </p>
                        <div style={{ marginTop: '2rem' }}>
                            <Link href={`/schedule?eventId=${nextEvent.id}`} className="btn btn-primary">View Details & RSVP</Link>
                        </div>
                    </>
                ) : (
                    <>
                        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-secondary)' }}>No Upcoming Games</h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginTop: '0.5rem' }}>Take a break and rest up!</p>
                        <div style={{ marginTop: '2rem' }}>
                            <Link href="/schedule" className="btn btn-primary">View Full Schedule</Link>
                        </div>
                    </>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.5rem' }}>
                <div className="card">
                    <div className="card-header">
                        <h2 className="card-title">Coach Announcements</h2>
                    </div>
                    {loading ? (
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading announcements...</p>
                    ) : dashboardData?.announcements && dashboardData.announcements.length > 0 ? (
                        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {dashboardData.announcements.slice(0, 3).map((announcement) => (
                                <div key={announcement.id} style={{ padding: '0.75rem', background: 'var(--surface-700)', borderRadius: '0.5rem' }}>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{announcement.title}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{announcement.content}</div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                                        {new Date(announcement.date).toLocaleDateString()}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>No recent announcements.</p>
                    )}
                </div>

                <div className="card">
                    <div className="card-header" style={{ marginBottom: '1rem' }}>
                        <h2 className="card-title">My Performance Hub</h2>
                    </div>
                    {loading ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Loading stats...</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Coach Feedback</h3>
                                {feedback.length > 0 ? (
                                    <div style={{ padding: '1rem', background: 'var(--surface-700)', borderRadius: '0.5rem', borderLeft: '4px solid var(--primary-500)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <div style={{ fontWeight: 'bold' }}>{feedback[0].coach.name}</div>
                                            <div style={{ color: 'var(--primary-400)', fontWeight: 'bold' }}>Effort: {feedback[0].effortRating}/5</div>
                                        </div>
                                        <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>"{feedback[0].note}"</p>
                                    </div>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No feedback yet.</p>
                                )}
                            </div>

                            <div>
                                <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem' }}>Recent Games</h3>
                                {stats.length > 0 ? (
                                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid var(--surface-600)', textAlign: 'left' }}>
                                                <th style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>Date</th>
                                                <th style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>PTS</th>
                                                <th style={{ padding: '0.5rem', color: 'var(--text-secondary)', fontWeight: 500, fontSize: '0.85rem' }}>AST</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.slice(0, 5).map(stat => (
                                                <tr key={stat.id} style={{ borderBottom: '1px solid var(--surface-700)' }}>
                                                    <td style={{ padding: '0.5rem', fontSize: '0.9rem' }}>{new Date(stat.event.startTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}</td>
                                                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{stat.metrics.points}</td>
                                                    <td style={{ padding: '0.5rem', fontWeight: 'bold' }}>{stat.metrics.assists}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ) : (
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>No game stats recorded.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
