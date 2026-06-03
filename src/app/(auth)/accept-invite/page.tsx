'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/passwordPolicy';

function AcceptInviteForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') || '';
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!isStrongPassword(password)) {
            setError(PASSWORD_POLICY_MESSAGE);
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/invites/accept', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, name, password }),
            });
            const data = await res.json();
            if (data.success) {
                router.push('/login');
            } else {
                setError(data.error || 'Failed to accept invite');
            }
        } catch {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg">
                <div className="auth-orb auth-orb--1" />
                <div className="auth-orb auth-orb--2" />
            </div>
            <div className="auth-container">
                <Link href="/" className="auth-logo">
                    <span className="auth-logo__icon">⚡</span>
                    <span className="auth-logo__text">HuddleBase</span>
                </Link>
                <div className="auth-card glass">
                    <h1 className="auth-title">Accept Team Invite</h1>
                    <p className="auth-subtitle">Set your password to finish joining your team.</p>
                    {error && <div className="auth-error"><span>⚠️</span>{error}</div>}
                    {!token ? (
                        <div className="auth-error"><span>⚠️</span>Invite token is missing.</div>
                    ) : (
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label className="form-label" htmlFor="invite-name">Name</label>
                                <input
                                    id="invite-name"
                                    className="form-input"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Optional display name"
                                    autoComplete="name"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="invite-password">Password</label>
                                <input
                                    id="invite-password"
                                    type="password"
                                    className="form-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label" htmlFor="invite-confirm-password">Confirm Password</label>
                                <input
                                    id="invite-confirm-password"
                                    type="password"
                                    className="form-input"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                                {loading ? 'Joining...' : 'Accept Invite'}
                            </button>
                        </form>
                    )}
                    <p className="auth-footer">
                        Already joined? <Link href="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function AcceptInvitePage() {
    return (
        <Suspense fallback={null}>
            <AcceptInviteForm />
        </Suspense>
    );
}
