'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { isStrongPassword, PASSWORD_POLICY_MESSAGE } from '@/lib/passwordPolicy';

const ROLES = [
    { value: 'COACH', label: 'Coach', icon: '📋', desc: 'Manage roster, schedule, and games' },
    { value: 'PARENT', label: 'Parent / Guardian', icon: '👪', desc: 'Track your child\'s activities' },
    { value: 'PLAYER', label: 'Player', icon: '🏃', desc: 'View schedule and RSVP' },
];

export default function RegisterPage() {
    const [step, setStep] = useState(1);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (step === 1) {
            if (!name || !email || !password) {
                setError('All fields are required');
                return;
            }
            if (!isStrongPassword(password)) {
                setError(PASSWORD_POLICY_MESSAGE);
                return;
            }
            setError('');
            setStep(2);
            return;
        }

        if (!role) {
            setError('Please select a role');
            return;
        }

        setError('');
        setLoading(true);
        const result = await register(name, email, password, role);
        if (result.success) {
            router.push('/dashboard');
        } else {
            setError(result.error || 'Registration failed');
        }
        setLoading(false);
    };

    return (
        <div className="auth-page">
            <div className="auth-bg">
                <div className="auth-orb auth-orb--1" />
                <div className="auth-orb auth-orb--2" />
            </div>

            <div className="auth-container" style={{ maxWidth: step === 2 ? '520px' : '420px' }}>
                <Link href="/" className="auth-logo">
                    <span className="auth-logo__icon">⚡</span>
                    <span className="auth-logo__text">HuddleBase</span>
                </Link>

                <div className="auth-card glass">
                    {/* Progress Indicator */}
                    <div className="register-progress">
                        <div className={`register-step ${step >= 1 ? 'active' : ''}`}>1</div>
                        <div className="register-step-line" />
                        <div className={`register-step ${step >= 2 ? 'active' : ''}`}>2</div>
                    </div>

                    <h1 className="auth-title">
                        {step === 1 ? 'Create Your Account' : 'Select Your Role'}
                    </h1>
                    <p className="auth-subtitle">
                        {step === 1 ? 'Get started with HuddleBase in seconds' : 'How will you be using HuddleBase?'}
                    </p>

                    {error && (
                        <div className="auth-error">
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form">
                        {step === 1 && (
                            <>
                                <div className="form-group">
                                    <label className="form-label" htmlFor="reg-name">Full Name</label>
                                    <input
                                        id="reg-name"
                                        type="text"
                                        className="form-input"
                                        placeholder="John Smith"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        autoComplete="name"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="reg-email">Email</label>
                                    <input
                                        id="reg-email"
                                        type="email"
                                        className="form-input"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        autoComplete="email"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label" htmlFor="reg-password">Password</label>
                                    <input
                                        id="reg-password"
                                        type="password"
                                        className="form-input"
                                        placeholder="Min. 10 characters with letters and numbers"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={10}
                                        autoComplete="new-password"
                                    />
                                    {password && (
                                        <div className="password-strength">
                                            <div className="password-bar">
                                                <div
                                                    className="password-bar__fill"
                                                    style={{
                                                        width: password.length < 6 ? '25%' : password.length < 10 ? '50%' : password.length < 14 ? '75%' : '100%',
                                                        background: password.length < 6 ? 'var(--danger-500)' : password.length < 10 ? 'var(--warning-500)' : 'var(--success-500)',
                                                    }}
                                                />
                                            </div>
                                            <span className="password-label">
                                                {password.length < 6 ? 'Weak' : password.length < 10 ? 'Fair' : password.length < 14 ? 'Strong' : 'Very Strong'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
                                    Continue →
                                </button>

                                <div className="auth-divider">
                                    <span>or continue with</span>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-google btn-lg"
                                    onClick={() => {
                                        setError('');
                                        setStep(2);
                                    }}
                                >
                                    <span className="google-mark">G</span>
                                    Continue with Google
                                </button>
                            </>
                        )}

                        {step === 2 && (
                            <>
                                <div className="role-grid">
                                    {ROLES.map((r) => (
                                        <button
                                            key={r.value}
                                            type="button"
                                            className={`role-card ${role === r.value ? 'role-card--selected' : ''}`}
                                            onClick={() => setRole(r.value)}
                                        >
                                            <span className="role-card__icon">{r.icon}</span>
                                            <span className="role-card__label">{r.label}</span>
                                            <span className="role-card__desc">{r.desc}</span>
                                        </button>
                                    ))}
                                </div>

                                <div style={{ display: 'flex', gap: '0.75rem' }}>
                                    <button
                                        type="button"
                                        className="btn btn-outline"
                                        style={{ flex: 1 }}
                                        onClick={() => setStep(1)}
                                    >
                                        ← Back
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn btn-primary btn-lg"
                                        style={{ flex: 2 }}
                                        disabled={loading || !role}
                                    >
                                        {loading ? 'Creating Account...' : 'Create Account'}
                                    </button>
                                </div>

                                <div className="auth-divider">
                                    <span>or continue with</span>
                                </div>

                                <Link
                                    href={`/api/auth/google/start?role=${encodeURIComponent(role || 'PLAYER')}`}
                                    className={`btn btn-google btn-lg ${!role ? 'btn-disabled' : ''}`}
                                    aria-disabled={!role}
                                    onClick={(event) => {
                                        if (!role) event.preventDefault();
                                    }}
                                >
                                    <span className="google-mark">G</span>
                                    Sign up with Google
                                </Link>
                            </>
                        )}
                    </form>

                    <p className="auth-footer">
                        Already have an account?{' '}
                        <Link href="/login">Sign in</Link>
                    </p>
                </div>
            </div>

        </div>
    );
}
