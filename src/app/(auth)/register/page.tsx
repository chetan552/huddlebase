'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { SPORTS } from '@/lib/constants';

const ROLES = [
    { value: 'ADMIN', label: 'Team Admin / Manager', icon: '🛡️', desc: 'Full control of team operations' },
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
            if (password.length < 6) {
                setError('Password must be at least 6 characters');
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
                                        placeholder="Min. 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={6}
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
                            </>
                        )}
                    </form>

                    <p className="auth-footer">
                        Already have an account?{' '}
                        <Link href="/login">Sign in</Link>
                    </p>
                </div>
            </div>

            <style jsx>{`
        .auth-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
        }
        .auth-bg {
          position: absolute;
          inset: 0;
        }
        .auth-orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(100px);
          opacity: 0.3;
        }
        .auth-orb--1 {
          width: 500px;
          height: 500px;
          background: #3b82f6;
          top: -20%;
          right: -10%;
          animation: float 8s ease-in-out infinite;
        }
        .auth-orb--2 {
          width: 400px;
          height: 400px;
          background: #14b8a6;
          bottom: -15%;
          left: -10%;
          animation: float 6s ease-in-out infinite reverse;
        }
        .auth-container {
          position: relative;
          z-index: 2;
          width: 100%;
          padding: 1.5rem;
          transition: max-width 0.3s ease;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          text-decoration: none;
        }
        .auth-logo__icon { font-size: 1.75rem; }
        .auth-logo__text {
          font-size: 1.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6, #14b8a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .auth-card { padding: 2.5rem; }
        .auth-title { font-size: 1.5rem; font-weight: 800; margin-bottom: 0.5rem; }
        .auth-subtitle { font-size: 0.9rem; color: var(--text-secondary); margin-bottom: 2rem; }
        .auth-form { display: flex; flex-direction: column; gap: 1.25rem; }
        .auth-error {
          display: flex; align-items: center; gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.75rem;
          color: var(--danger-400);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }
        .auth-footer {
          text-align: center; margin-top: 1.5rem;
          font-size: 0.875rem; color: var(--text-secondary);
        }

        /* Progress Steps */
        .register-progress {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0;
          margin-bottom: 1.5rem;
        }
        .register-step {
          width: 32px; height: 32px;
          border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-size: 0.8rem; font-weight: 700;
          background: var(--surface-700);
          color: var(--text-tertiary);
          transition: all 0.3s ease;
        }
        .register-step.active {
          background: var(--gradient-primary);
          color: white;
        }
        .register-step-line {
          width: 60px; height: 2px;
          background: var(--surface-700);
        }

        /* Password Strength */
        .password-strength {
          display: flex; align-items: center; gap: 0.75rem;
        }
        .password-bar {
          flex: 1; height: 4px; background: var(--surface-700); border-radius: 2px; overflow: hidden;
        }
        .password-bar__fill {
          height: 100%; border-radius: 2px; transition: all 0.3s ease;
        }
        .password-label {
          font-size: 0.7rem; color: var(--text-tertiary); white-space: nowrap;
        }

        /* Role Grid */
        .role-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
        }
        .role-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.25rem;
          padding: 1.25rem 1rem;
          background: var(--surface-800);
          border: 2px solid var(--surface-600);
          border-radius: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: center;
        }
        .role-card:hover {
          border-color: var(--primary-500);
          background: var(--surface-700);
        }
        .role-card--selected {
          border-color: var(--primary-500);
          background: rgba(59, 130, 246, 0.1);
          box-shadow: 0 0 20px rgba(59, 130, 246, 0.15);
        }
        .role-card__icon { font-size: 1.75rem; margin-bottom: 0.25rem; }
        .role-card__label { font-size: 0.85rem; font-weight: 600; color: var(--text-primary); }
        .role-card__desc { font-size: 0.7rem; color: var(--text-tertiary); line-height: 1.3; }

        @media (max-width: 480px) {
          .role-grid { grid-template-columns: 1fr; }
        }
      `}</style>
        </div>
    );
}
