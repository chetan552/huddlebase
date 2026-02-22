'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

const FEATURES = [
  {
    icon: '👥',
    title: 'Team & Roster',
    description: 'Manage players, coaches, and parents with role-based access. Import rosters via CSV.',
  },
  {
    icon: '📅',
    title: 'Smart Scheduling',
    description: 'Practices, games, and meetings with recurring events, calendar sync, and reminders.',
  },
  {
    icon: '✅',
    title: 'RSVP & Attendance',
    description: 'Track availability, attendance history, and generate reports with one tap.',
  },
  {
    icon: '💬',
    title: 'Team Chat',
    description: 'Real-time messaging, announcements, event threads, and push notifications.',
  },
  {
    icon: '💵',
    title: 'Payments',
    description: 'Create invoices, track payments, manage installments, and export financial reports.',
  },
  {
    icon: '📊',
    title: 'Analytics',
    description: 'Attendance trends, revenue insights, team health scores, and performance tracking.',
  },
];

const STATS = [
  { value: '10K+', label: 'Teams Managed' },
  { value: '500K+', label: 'Players Registered' },
  { value: '2M+', label: 'Events Scheduled' },
  { value: '99.9%', label: 'Uptime' },
];

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="landing">
      {/* Navigation */}
      <nav className="landing-nav" style={{
        backdropFilter: scrollY > 50 ? 'blur(20px)' : 'none',
        background: scrollY > 50 ? 'rgba(10, 14, 26, 0.85)' : 'transparent',
        borderBottom: scrollY > 50 ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid transparent',
      }}>
        <div className="landing-nav__inner">
          <div className="landing-logo">
            <span className="landing-logo__icon">⚡</span>
            <span className="landing-logo__text">HuddleBase</span>
          </div>
          <div className="landing-nav__links">
            <a href="#features" className="landing-nav__link">Features</a>
            <a href="#stats" className="landing-nav__link">About</a>
            <Link href="/login" className="btn btn-outline btn-sm">Log In</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero__bg">
          <div className="hero__orb hero__orb--1" />
          <div className="hero__orb hero__orb--2" />
          <div className="hero__orb hero__orb--3" />
        </div>
        <div className="hero__content">
          <div className="hero__badge">
            <span className="hero__badge-dot" />
            Now available for all sports
          </div>
          <h1 className="hero__title">
            The <span className="hero__title-gradient">Heartbeat</span> of Your Team
          </h1>
          <p className="hero__subtitle">
            Manage rosters, schedules, communication, payments, and analytics —
            all in one beautiful platform. Built for modern sports teams.
          </p>
          <div className="hero__actions">
            <Link href="/register" className="btn btn-primary btn-lg">
              Start Free Trial
              <span style={{ fontSize: '1.2em' }}>→</span>
            </Link>
            <Link href="#features" className="btn btn-outline btn-lg">
              See Features
            </Link>
          </div>
          <div className="hero__social-proof">
            <div className="hero__avatars">
              {['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'].map((color, i) => (
                <div
                  key={i}
                  className="hero__avatar"
                  style={{ background: color, marginLeft: i > 0 ? '-8px' : 0, zIndex: 5 - i }}
                />
              ))}
            </div>
            <span className="hero__social-text">
              Trusted by <strong>10,000+</strong> teams worldwide
            </span>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Features</span>
            <h2 className="section-title">Everything Your Team Needs</h2>
            <p className="section-subtitle">
              From scheduling to payments, HuddleBase handles it all so you can focus on winning.
            </p>
          </div>
          <div className="features-grid">
            {FEATURES.map((feature, i) => (
              <div key={i} className="feature-card" style={{ animationDelay: `${i * 100}ms` }}>
                <div className="feature-card__icon">{feature.icon}</div>
                <h3 className="feature-card__title">{feature.title}</h3>
                <p className="feature-card__desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="stats-section">
        <div className="container">
          <div className="stats-grid">
            {STATS.map((stat, i) => (
              <div key={i} className="stats-item">
                <div className="stats-item__value">{stat.value}</div>
                <div className="stats-item__label">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card glass">
            <h2 className="cta-card__title">Ready to Get Started?</h2>
            <p className="cta-card__desc">
              Join thousands of teams using HuddleBase to streamline their operations.
            </p>
            <Link href="/register" className="btn btn-primary btn-lg">
              Create Your Team — It&apos;s Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="landing-footer__inner">
            <div className="landing-logo">
              <span className="landing-logo__icon">⚡</span>
              <span className="landing-logo__text">HuddleBase</span>
            </div>
            <p className="landing-footer__copy">
              © 2026 HuddleBase. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .landing {
          min-height: 100vh;
          overflow-x: hidden;
        }

        /* Nav */
        .landing-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          transition: all 0.3s ease;
          padding: 0 1.5rem;
        }
        .landing-nav__inner {
          max-width: 1200px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 64px;
        }
        .landing-logo {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .landing-logo__icon {
          font-size: 1.5rem;
        }
        .landing-logo__text {
          font-size: 1.25rem;
          font-weight: 800;
          background: linear-gradient(135deg, #3b82f6, #14b8a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .landing-nav__links {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }
        .landing-nav__link {
          font-size: 0.875rem;
          color: var(--text-secondary);
          transition: color 0.2s;
        }
        .landing-nav__link:hover {
          color: var(--text-primary);
        }

        /* Hero */
        .hero {
          position: relative;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 6rem 1.5rem 4rem;
          overflow: hidden;
        }
        .hero__bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }
        .hero__orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.4;
        }
        .hero__orb--1 {
          width: 500px;
          height: 500px;
          background: #3b82f6;
          top: -10%;
          left: 20%;
          animation: float 8s ease-in-out infinite;
        }
        .hero__orb--2 {
          width: 400px;
          height: 400px;
          background: #14b8a6;
          bottom: -5%;
          right: 15%;
          animation: float 6s ease-in-out infinite reverse;
        }
        .hero__orb--3 {
          width: 300px;
          height: 300px;
          background: #8b5cf6;
          top: 40%;
          left: -5%;
          animation: float 10s ease-in-out infinite;
        }
        .hero__content {
          position: relative;
          z-index: 2;
          max-width: 800px;
        }
        .hero__badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.375rem 1rem;
          background: rgba(59, 130, 246, 0.1);
          border: 1px solid rgba(59, 130, 246, 0.25);
          border-radius: 9999px;
          font-size: 0.8rem;
          color: var(--primary-400);
          margin-bottom: 2rem;
          animation: fadeIn 0.5s ease;
        }
        .hero__badge-dot {
          width: 6px;
          height: 6px;
          background: var(--success-400);
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        .hero__title {
          font-size: clamp(2.5rem, 6vw, 4.5rem);
          font-weight: 900;
          line-height: 1.1;
          margin-bottom: 1.5rem;
          animation: slideUp 0.6s ease;
        }
        .hero__title-gradient {
          background: linear-gradient(135deg, #3b82f6, #14b8a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero__subtitle {
          font-size: clamp(1rem, 2vw, 1.25rem);
          color: var(--text-secondary);
          max-width: 600px;
          margin: 0 auto 2.5rem;
          line-height: 1.6;
          animation: slideUp 0.7s ease;
        }
        .hero__actions {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
          margin-bottom: 3rem;
          animation: slideUp 0.8s ease;
        }
        .hero__social-proof {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          animation: fadeIn 1s ease;
        }
        .hero__avatars {
          display: flex;
        }
        .hero__avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2px solid var(--surface-900);
        }
        .hero__social-text {
          font-size: 0.85rem;
          color: var(--text-secondary);
        }
        .hero__social-text strong {
          color: var(--text-primary);
        }

        /* Section Common */
        .section-header {
          text-align: center;
          margin-bottom: 4rem;
        }
        .section-label {
          display: inline-block;
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--primary-400);
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.75rem;
        }
        .section-title {
          font-size: clamp(1.75rem, 4vw, 2.5rem);
          font-weight: 800;
          margin-bottom: 1rem;
        }
        .section-subtitle {
          font-size: 1.05rem;
          color: var(--text-secondary);
          max-width: 500px;
          margin: 0 auto;
        }

        /* Features */
        .features-section {
          padding: 6rem 0;
          position: relative;
        }
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }
        .feature-card {
          background: var(--surface-800);
          border: 1px solid var(--surface-700);
          border-radius: 1rem;
          padding: 2rem;
          transition: all 0.3s ease;
          animation: slideUp 0.5s ease both;
        }
        .feature-card:hover {
          border-color: var(--primary-500);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
        .feature-card__icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        .feature-card__title {
          font-size: 1.15rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }
        .feature-card__desc {
          font-size: 0.9rem;
          color: var(--text-secondary);
          line-height: 1.6;
        }

        /* Stats */
        .stats-section {
          padding: 4rem 0;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
        }
        .stats-item {
          text-align: center;
        }
        .stats-item__value {
          font-size: 2.5rem;
          font-weight: 900;
          background: linear-gradient(135deg, #3b82f6, #14b8a6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .stats-item__label {
          font-size: 0.9rem;
          color: var(--text-secondary);
          margin-top: 0.25rem;
        }

        /* CTA */
        .cta-section {
          padding: 4rem 0 6rem;
        }
        .cta-card {
          text-align: center;
          padding: 4rem 2rem;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(20, 184, 166, 0.1));
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .cta-card__title {
          font-size: 2rem;
          font-weight: 800;
          margin-bottom: 1rem;
        }
        .cta-card__desc {
          color: var(--text-secondary);
          margin-bottom: 2rem;
          font-size: 1.05rem;
        }

        /* Footer */
        .landing-footer {
          border-top: 1px solid var(--surface-700);
          padding: 2rem 0;
        }
        .landing-footer__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .landing-footer__copy {
          font-size: 0.8rem;
          color: var(--text-tertiary);
        }

        @media (max-width: 768px) {
          .landing-nav__links a:not(.btn) {
            display: none;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
          .hero__title {
            font-size: 2.5rem;
          }
          .landing-footer__inner {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }
        }
      `}</style>
    </div>
  );
}
