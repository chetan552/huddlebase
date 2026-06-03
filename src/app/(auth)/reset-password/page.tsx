'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get('token') || '';
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (password.length < 8) {
            setError('Password must be at least 8 characters');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/auth/password-reset/confirm', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password }),
            });
            const data = await res.json();
            if (data.success) {
                router.push('/login');
            } else {
                setError(data.error || 'Failed to reset password');
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
                    <h1 className="auth-title">Choose New Password</h1>
                    <p className="auth-subtitle">Enter a new password for your account.</p>
                    {error && <div className="auth-error"><span>⚠️</span>{error}</div>}
                    {!token ? (
                        <div className="auth-error"><span>⚠️</span>Reset token is missing.</div>
                    ) : (
                        <form onSubmit={handleSubmit} className="auth-form">
                            <div className="form-group">
                                <label className="form-label" htmlFor="new-password">New Password</label>
                                <input
                                    id="new-password"
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
                                <label className="form-label" htmlFor="confirm-password">Confirm Password</label>
                                <input
                                    id="confirm-password"
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
                                {loading ? 'Saving...' : 'Reset Password'}
                            </button>
                        </form>
                    )}
                    <p className="auth-footer">
                        Back to <Link href="/login">sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={null}>
            <ResetPasswordForm />
        </Suspense>
    );
}
