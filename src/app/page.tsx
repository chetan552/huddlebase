'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Users, Calendar, CheckCircle2, MessageCircle, Banknote, BarChart3, Zap } from 'lucide-react';

const FEATURES = [
  {
    icon: <Users size={28} />,
    title: 'Team & Roster',
    description: 'Manage players, coaches, and parents with role-based access. Import rosters via CSV.',
  },
  {
    icon: <Calendar size={28} />,
    title: 'Smart Scheduling',
    description: 'Practices, games, and meetings with recurring events, calendar sync, and reminders.',
  },
  {
    icon: <CheckCircle2 size={28} />,
    title: 'RSVP & Attendance',
    description: 'Track availability, attendance history, and generate reports with one tap.',
  },
  {
    icon: <MessageCircle size={28} />,
    title: 'Team Chat',
    description: 'Real-time messaging, announcements, event threads, and push notifications.',
  },
  {
    icon: <Banknote size={28} />,
    title: 'Payments',
    description: 'Create invoices, track payments, manage installments, and export financial reports.',
  },
  {
    icon: <BarChart3 size={28} />,
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
            <span className="landing-logo__icon"><Zap size={20} /></span>
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
                <div className="feature-card__icon" style={{ color: 'var(--primary-400)' }}>{feature.icon}</div>
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
              <span className="landing-logo__icon"><Zap size={20} /></span>
              <span className="landing-logo__text">HuddleBase</span>
            </div>
            <p className="landing-footer__copy">
              © 2026 HuddleBase. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}
