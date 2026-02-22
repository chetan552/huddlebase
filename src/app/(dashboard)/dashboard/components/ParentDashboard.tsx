'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Event {
    id: string; title: string; type: string; startTime: string; location: string | null; teamName: string; teamColor: string; teamId?: string;
}

interface Team {
    id: string; name: string; sport: string; color: string;
}

interface Child {
    id: string; name: string; email: string; avatar: string | null;
    teamMembers: Array<{ team: { id: string, name: string, color: string } }>;
}

export default function ParentDashboard({ user }: { user: any }) {
    const [nextEvent, setNextEvent] = useState<Event | null>(null);
    const [children, setChildren] = useState<Child[]>([]);
    const [teams, setTeams] = useState<Team[]>([]);
    const [pendingInvoicesCount, setPendingInvoicesCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showAddChildModal, setShowAddChildModal] = useState(false);
    const [childEmail, setChildEmail] = useState('');
    const [addError, setAddError] = useState('');

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch Family Link (My Children)
                const familyRes = await fetch('/api/family');
                let familyData = { success: false, data: [] };
                if (familyRes.ok) {
                    familyData = await familyRes.json();
                    if (familyData.success) {
                        setChildren(familyData.data);

                        // Derived Teams for MVP: aggregate teams from all children
                        const allTeams: Record<string, Team> = {};
                        familyData.data.forEach((child: Child) => {
                            child.teamMembers.forEach(tm => {
                                allTeams[tm.team.id] = { id: tm.team.id, name: tm.team.name, color: tm.team.color, sport: "Youth Sports" };
                            });
                        });
                        setTeams(Object.values(allTeams));
                    }
                }

                // Fetch Events to find Next Event
                const eventsRes = await fetch('/api/events');
                const eventsData = await eventsRes.json();
                if (eventsData.success && familyData.success) {
                    // Filter events to only those teams our children are on
                    const childTeamIds = new Set();
                    familyData.data.forEach((child: Child) => {
                        child.teamMembers.forEach(tm => childTeamIds.add(tm.team.id));
                    });

                    const now = new Date();
                    const futureEvents = eventsData.data
                        .filter((e: Event) => new Date(e.startTime) > now && childTeamIds.has(e.teamId || e.id)) // Simplified check for MVP
                        .sort((a: Event, b: Event) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

                    if (futureEvents.length > 0) {
                        setNextEvent(futureEvents[0]);
                    }
                }

                // Fetch Invoices
                const invoicesRes = await fetch('/api/invoices');
                if (invoicesRes.ok) { // Not all APIs have the same success wrapper, handle gracefully
                    const invoicesData = await invoicesRes.json();
                    if (invoicesData.success && Array.isArray(invoicesData.data)) {
                        const pending = invoicesData.data.filter((i: any) => i.status === 'PENDING').length;
                        setPendingInvoicesCount(pending);
                    }
                }
            } catch (err) {
                console.error('Failed to load parent dashboard data', err);
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const handleAddChild = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddError('');
        try {
            const res = await fetch('/api/family', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ childEmail }),
            });
            const data = await res.json();

            if (data.success) {
                setShowAddChildModal(false);
                setChildEmail('');
                // Note: Real app would re-fetch dashboard here, we'll force reload for MVP simplicity
                window.location.reload();
            } else {
                setAddError(data.error || 'Failed to add child.');
            }
        } catch (err) {
            setAddError('Internal error adding child.');
        }
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div>
                    <h1 className="page-title">
                        Welcome back, {user?.name?.split(' ')[0]}
                    </h1>
                    <p className="page-subtitle">Here is your family&apos;s schedule and updates.</p>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '2rem' }}>
                <div className="card">
                    <h2 className="card-title">Next Event</h2>
                    {loading ? (
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Loading schedule...</p>
                    ) : nextEvent ? (
                        <div style={{ marginTop: '1rem' }}>
                            <div style={{ padding: '1rem', background: 'var(--surface-700)', borderRadius: '0.5rem', borderLeft: `4px solid ${nextEvent.teamColor || 'var(--primary-500)'}` }}>
                                <div style={{ fontWeight: 'bold' }}>{nextEvent.title}</div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    {new Date(nextEvent.startTime).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                    {nextEvent.teamName} • {nextEvent.type}
                                </div>
                                {nextEvent.location && (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                                        📍 {nextEvent.location}
                                    </div>
                                )}
                            </div>
                            <Link href={`/schedule?eventId=${nextEvent.id}`} className="btn btn-outline" style={{ marginTop: '1rem', width: '100%', justifyContent: 'center' }}>
                                View Details & RSVP
                            </Link>
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>No upcoming events scheduled.</p>
                    )}
                </div>
                <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 className="card-title" style={{ marginBottom: 0 }}>My Family</h2>
                        <button onClick={() => setShowAddChildModal(true)} className="btn btn-primary" style={{ padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}>+ Add Child</button>
                    </div>
                    {loading ? (
                        <p style={{ color: 'var(--text-secondary)' }}>Loading family hub...</p>
                    ) : children.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            {children.map(child => (
                                <Link href={`/roster/${child.id}`} key={child.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', background: 'var(--surface-700)', borderRadius: '0.5rem', textDecoration: 'none', color: 'inherit' }} className="card-interactive">
                                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary-600)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                                        {child.name.charAt(0)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{child.name}</div>
                                        <div style={{ display: 'flex', gap: '0.25rem', marginTop: '0.25rem' }}>
                                            {child.teamMembers.length > 0 ? child.teamMembers.map(tm => (
                                                <span key={tm.team.id} style={{ fontSize: '0.7rem', padding: '1px 6px', background: tm.team.color || 'var(--surface-600)', color: 'white', borderRadius: '4px' }}>
                                                    {tm.team.name}
                                                </span>
                                            )) : <span style={{ fontSize: '0.7rem', color: 'var(--text-tertiary)' }}>No active teams</span>}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                            <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>You haven&apos;t linked any player accounts yet. 👨‍👩‍👧‍👦</p>
                            <button onClick={() => setShowAddChildModal(true)} className="btn btn-outline" style={{ fontSize: '0.9rem' }}>Link your child&apos;s account</button>
                        </div>
                    )}
                </div>
            </div>

            <div className="card" style={{ marginTop: '1.5rem' }}>
                <h2 className="card-title">Pending Payments</h2>
                {loading ? (
                    <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Checking invoices...</p>
                ) : pendingInvoicesCount > 0 ? (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem', padding: '1rem', background: 'var(--danger-400)20', border: '1px solid var(--danger-400)', borderRadius: '0.5rem' }}>
                        <div>
                            <div style={{ fontWeight: 'bold', color: 'var(--danger-400)' }}>Action Required</div>
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>You have {pendingInvoicesCount} unpaid {pendingInvoicesCount === 1 ? 'invoice' : 'invoices'}.</div>
                        </div>
                        <Link href="/payments" className="btn btn-primary" style={{ background: 'var(--danger-400)' }}>
                            Pay Now
                        </Link>
                    </div>
                ) : (
                    <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>You have no pending payments. All caught up! 🎉</p>
                )}
            </div>

            {/* Add Child Modal */}
            {showAddChildModal && (
                <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowAddChildModal(false) }}>
                    <div className="modal-content" style={{ maxWidth: 400 }}>
                        <div className="modal-header">
                            <h2 className="modal-title">Link Child Account</h2>
                        </div>
                        <form onSubmit={handleAddChild}>
                            <div className="modal-body">
                                <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                                    Enter the email address your child uses to access their Player Dashboard. We&apos;ll automatically link their schedule and stats to your Family Hub.
                                </p>
                                <div className="form-group">
                                    <label className="form-label">Player Email Address</label>
                                    <input
                                        type="email"
                                        required
                                        className="form-input"
                                        placeholder="athlete@example.com"
                                        value={childEmail}
                                        onChange={(e) => setChildEmail(e.target.value)}
                                    />
                                    {addError && <span style={{ color: 'var(--danger-400)', fontSize: '0.8rem', marginTop: '0.25rem', display: 'block' }}>{addError}</span>}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline" onClick={() => setShowAddChildModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Link Account</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
