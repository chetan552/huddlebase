'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const res = await fetch('/api/auth/password-reset/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage(data.message);
            } else {
                setError(data.error || 'Failed to request password reset');
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
                    <h1 className="auth-title">Reset Password</h1>
                    <p className="auth-subtitle">Enter your email and we&apos;ll send a reset link.</p>
                    {error && <div className="auth-error"><span>⚠️</span>{error}</div>}
                    {message && <div className="auth-success">{message}</div>}
                    <form onSubmit={handleSubmit} className="auth-form">
                        <div className="form-group">
                            <label className="form-label" htmlFor="reset-email">Email</label>
                            <input
                                id="reset-email"
                                type="email"
                                className="form-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                            />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%' }}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                    <p className="auth-footer">
                        Remembered your password? <Link href="/login">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
