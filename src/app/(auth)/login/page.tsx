'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(email, password);
    if (result.success) {
      router.push('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
    setLoading(false);
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
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to your account to continue</p>

          {error && (
            <div className="auth-error">
              <span>⚠️</span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label" htmlFor="email">Email</label>
              <input
                id="email"
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
              <label className="form-label" htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: '0.5rem' }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider">
            <span>or use demo account</span>
          </div>

          <button
            className="btn btn-outline"
            style={{ width: '100%' }}
            onClick={async () => {
              setError('');
              setLoading(true);
              const result = await login('coach@huddlebase.com', 'password123');
              if (result.success) {
                router.push('/dashboard');
              } else {
                setError('Demo account not found. Please seed the database first.');
              }
              setLoading(false);
            }}
          >
            🏈 Log in as Demo Coach
          </button>

          <button
            className="btn btn-outline"
            style={{ width: '100%', marginTop: '0.5rem' }}
            onClick={async () => {
              setError('');
              setLoading(true);
              const result = await login('parent@huddlebase.com', 'password123');
              if (result.success) {
                router.push('/dashboard');
              } else {
                setError('Demo account not found. Please seed the database first.');
              }
              setLoading(false);
            }}
          >
            👪 Log in as Demo Parent
          </button>

          <p className="auth-footer">
            Don&apos;t have an account?{' '}
            <Link href="/register">Create one</Link>
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
          max-width: 420px;
          padding: 1.5rem;
        }
        .auth-logo {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
          text-decoration: none;
        }
        .auth-logo__icon {
          font-size: 1.75rem;
        }
        .auth-logo__text {
          font-size: 1.5rem;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6, #14b8a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .auth-card {
          padding: 2.5rem;
        }
        .auth-title {
          font-size: 1.5rem;
          font-weight: 800;
          margin-bottom: 0.5rem;
        }
        .auth-subtitle {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-bottom: 2rem;
        }
        .auth-form {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }
        .auth-error {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: 0.75rem;
          color: var(--danger-400);
          font-size: 0.875rem;
          margin-bottom: 0.5rem;
        }
        .auth-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin: 1.5rem 0;
          color: var(--text-tertiary);
          font-size: 0.8rem;
        }
        .auth-divider::before,
        .auth-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: var(--surface-600);
        }
        .auth-footer {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.875rem;
          color: var(--text-secondary);
        }
      `}</style>
    </div>
  );
}
