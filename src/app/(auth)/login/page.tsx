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

    </div>
  );
}
