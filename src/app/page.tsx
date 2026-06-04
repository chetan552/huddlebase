'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users, Calendar, CheckCircle2, MessageCircle, Banknote, BarChart3,
  Zap, Sparkles, Upload, Download, Bell, ClipboardList, Trophy,
  ArrowRight, Star, Shield, Clock,
} from 'lucide-react';

const FEATURES = [
  {
    icon: <Users size={24} />,
    color: '#3b82f6',
    title: 'Roster Management',
    description: 'Add players one-by-one or bulk-import from CSV. Track roles, jerseys, positions, and categories across every team you manage.',
    badge: 'CSV Import',
  },
  {
    icon: <Calendar size={24} />,
    color: '#14b8a6',
    title: 'Smart Scheduling',
    description: 'Create practices, games, and meetings with recurring rules. Players get notified instantly and can RSVP in seconds.',
  },
  {
    icon: <CheckCircle2 size={24} />,
    color: '#22c55e',
    title: 'Attendance Tracking',
    description: 'Take attendance at every event with a single tap. Export full attendance history as CSV for reporting or review.',
    badge: 'Export CSV',
  },
  {
    icon: <MessageCircle size={24} />,
    color: '#8b5cf6',
    title: 'Team Chat',
    description: 'Real-time messaging with threaded conversations per event. Coaches can pin announcements, players stay in the loop.',
  },
  {
    icon: <Banknote size={24} />,
    color: '#f59e0b',
    title: 'Payments & Invoices',
    description: 'Create and track invoices, mark payments received, flag overdue accounts, and export financial reports in one click.',
    badge: 'Export CSV',
  },
  {
    icon: <BarChart3 size={24} />,
    color: '#ef4444',
    title: 'Analytics Dashboard',
    description: 'Revenue charts, per-player attendance rates, effort trend lines, and overdue payment summaries — all at a glance.',
  },
  {
    icon: <Sparkles size={24} />,
    color: '#a855f7',
    title: 'AI Practice Plans',
    description: 'Generate fully structured, sport-specific practice plans in seconds. Drills, progressions, coaching cues, and cool-downs — ready to run.',
    highlight: true,
  },
  {
    icon: <Bell size={24} />,
    color: '#0ea5e9',
    title: 'Smart Notifications',
    description: 'Automated alerts for new events, messages, and upcoming invoices. Players and parents never miss what matters.',
  },
  {
    icon: <Trophy size={24} />,
    color: '#f97316',
    title: 'Game Results',
    description: 'Log scores, opponent details, and game outcomes. Build a complete season record your team can look back on.',
  },
];

const SPORTS = [
  'Soccer', 'Basketball', 'Baseball', 'Football', 'Hockey',
  'Volleyball', 'Tennis', 'Lacrosse', 'Swimming', 'Track & Field',
  'Softball', 'Rugby', 'Cricket', 'Field Hockey', 'Water Polo', 'Table Tennis',
];

const STEPS = [
  {
    number: '01',
    title: 'Create your team',
    description: 'Sign up, create your team, set your sport and season. Invite players by email or import a full roster from CSV.',
    icon: <Users size={20} />,
  },
  {
    number: '02',
    title: 'Manage everything in one place',
    description: 'Schedule events, track attendance, send messages, manage invoices, and generate AI practice plans — from one dashboard.',
    icon: <ClipboardList size={20} />,
  },
  {
    number: '03',
    title: 'Win with data',
    description: 'Use real attendance trends, revenue charts, and effort ratings to make smarter decisions every week.',
    icon: <BarChart3 size={20} />,
  },
];

const STATS = [
  { value: '20+', label: 'Sports Supported' },
  { value: '100%', label: 'Free to Start' },
  { value: '9', label: 'Powerful Modules' },
  { value: 'AI', label: 'Practice Planning' },
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
        background: scrollY > 50 ? 'rgba(10, 14, 26, 0.9)' : 'transparent',
        borderBottom: scrollY > 50 ? '1px solid rgba(148, 163, 184, 0.1)' : '1px solid transparent',
      }}>
        <div className="landing-nav__inner">
          <div className="landing-logo">
            <span className="landing-logo__icon"><Zap size={20} /></span>
            <span className="landing-logo__text">HuddleBase</span>
          </div>
          <div className="landing-nav__links">
            <a href="#features" className="landing-nav__link">Features</a>
            <a href="#how-it-works" className="landing-nav__link">How It Works</a>
            <a href="#sports" className="landing-nav__link">Sports</a>
            <Link href="/login" className="btn btn-outline btn-sm">Log In</Link>
            <Link href="/register" className="btn btn-primary btn-sm">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="hero__bg">
          <div className="hero__orb hero__orb--1" />
          <div className="hero__orb hero__orb--2" />
          <div className="hero__orb hero__orb--3" />
        </div>
        <div className="hero__content">
          <div className="hero__badge">
            <span className="hero__badge-dot" />
            Now with AI-powered practice planning
          </div>
          <h1 className="hero__title">
            Run Your Team.<br />
            <span className="hero__title-gradient">Not Your Spreadsheets.</span>
          </h1>
          <p className="hero__subtitle">
            HuddleBase gives coaches, players, and parents one place for schedules,
            attendance, payments, chat, analytics, and AI-generated practice plans.
            Stop juggling apps. Start winning.
          </p>
          <div className="hero__actions">
            <Link href="/register" className="btn btn-primary btn-lg" style={{ gap: '0.5rem' }}>
              Start Free — No Credit Card
              <ArrowRight size={18} />
            </Link>
            <Link href="/login" className="btn btn-outline btn-lg">
              Sign In
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
              Trusted by <strong>coaches and teams</strong> across 20+ sports
            </span>
          </div>

          {/* Quick-win badges */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center', marginTop: '2rem' }}>
            {[
              { icon: <Sparkles size={13} />, text: 'AI Practice Plans' },
              { icon: <Upload size={13} />, text: 'CSV Import' },
              { icon: <Download size={13} />, text: 'CSV Export' },
              { icon: <Shield size={13} />, text: 'Role-Based Access' },
              { icon: <Clock size={13} />, text: 'Real-Time Chat' },
            ].map((b, i) => (
              <span key={i} style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                padding: '0.35rem 0.75rem', borderRadius: '2rem',
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                fontSize: '0.78rem', color: 'var(--text-secondary)',
              }}>
                {b.icon} {b.text}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
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

      {/* AI Spotlight */}
      <section style={{ padding: '5rem 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', inset: 0,
          background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139,92,246,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div className="container">
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center',
          }} className="ai-spotlight-grid">
            <div>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.9rem', borderRadius: '2rem',
                background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)',
                color: '#c084fc', fontSize: '0.78rem', fontWeight: 600, marginBottom: '1.5rem',
              }}>
    
              </span>
              <h2 style={{ fontSize: '2.25rem', fontWeight: 800, lineHeight: 1.2, marginBottom: '1.25rem' }}>
                Practice plans in seconds,<br />
                <span style={{ background: 'linear-gradient(135deg, #a855f7, #6366f1)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  not hours.
                </span>
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: 1.7, marginBottom: '2rem' }}>
                Tell our AI your sport, age group, session length, and skill focus. Get back a
                complete practice plan with warm-ups, drills, progressions, scrimmage rules, and
                coaching cues — tailored to your team, ready to run.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem' }}>
                {[
                  'Warm-up activities with timing',
                  'Skill drills with step-by-step setup',
                  'Progressions for advanced players',
                  'Scrimmage with rule modifications',
                  'Cool-down and reflection questions',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <CheckCircle2 size={16} style={{ color: '#a855f7', flexShrink: 0 }} />
                    {item}
                  </div>
                ))}
              </div>
              <Link href="/register" className="btn btn-primary" style={{ gap: '0.5rem' }}>
                <Sparkles size={15} /> Try AI Practice Plans Free
              </Link>
            </div>

            {/* Mock plan card */}
            <div style={{
              background: 'var(--surface-800)', border: '1px solid rgba(168,85,247,0.25)',
              borderRadius: '1.25rem', padding: '1.75rem',
              boxShadow: '0 0 60px rgba(139,92,246,0.12)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
                <Sparkles size={16} style={{ color: '#a855f7' }} />
                <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>Soccer Practice Plan — 60 min</span>
              </div>
              {[
                { section: '## Overview', lines: ['Build confidence in tight spaces through possession-based drills and small-sided play.'] },
                { section: '## Warm-Up (9 min)', lines: ['**Rondo Activation** (5 min): 4v2 in a 10×10 grid.', '**Dynamic Stretching** (4 min): Hip openers, leg swings, high knees.'] },
                { section: '## Skill Development (27 min)', lines: ['**1v1 Box Challenge** (10 min): Develop dribbling under pressure.', '**Passing Under Pressure** (17 min): Triangle passing with a defender.'] },
              ].map((block, i) => (
                <div key={i} style={{ marginBottom: '1rem' }}>
                  <div style={{ color: '#a855f7', fontWeight: 700, fontSize: '0.82rem', marginBottom: '0.35rem' }}>{block.section}</div>
                  {block.lines.map((line, j) => (
                    <div key={j} style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.6, paddingLeft: '0.5rem' }}>
                      {line.startsWith('**') ? (
                        <span>• <strong style={{ color: 'var(--text-primary)' }}>{line.match(/\*\*([^*]+)\*\*/)?.[1]}</strong>{line.replace(/\*\*[^*]+\*\*/, '')}</span>
                      ) : line}
                    </div>
                  ))}
                </div>
              ))}
              <div style={{
                marginTop: '1rem', padding: '0.6rem 0.75rem', borderRadius: '0.5rem',
                background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.15)',
                fontSize: '0.75rem', color: '#c084fc',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', animation: 'pulse 2s infinite' }} />
                Generated in 8 seconds · Fully editable · Copy with one click
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">Everything Included</span>
            <h2 className="section-title">One Platform. Every Workflow.</h2>
            <p className="section-subtitle">
              Nine powerful modules that replace the five different tools your team is juggling right now.
            </p>
          </div>
          <div className="features-grid">
            {FEATURES.map((feature, i) => (
              <div
                key={i}
                className="feature-card"
                style={{
                  animationDelay: `${i * 60}ms`,
                  ...(feature.highlight ? {
                    borderColor: 'rgba(168,85,247,0.35)',
                    background: 'linear-gradient(135deg, var(--surface-800) 0%, rgba(139,92,246,0.06) 100%)',
                  } : {}),
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {feature.badge && (
                  <span style={{
                    position: 'absolute', top: '1rem', right: '1rem',
                    fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: '2rem',
                    background: feature.highlight ? 'rgba(168,85,247,0.2)' : 'rgba(59,130,246,0.15)',
                    color: feature.highlight ? '#c084fc' : 'var(--primary-400)',
                    border: `1px solid ${feature.highlight ? 'rgba(168,85,247,0.3)' : 'rgba(59,130,246,0.2)'}`,
                  }}>
                    {feature.badge}
                  </span>
                )}
                <div className="feature-card__icon" style={{ color: feature.color, display: 'inline-flex', padding: '0.75rem', borderRadius: '0.75rem', background: `${feature.color}18`, marginBottom: '1rem' }}>
                  {feature.icon}
                </div>
                <h3 className="feature-card__title">{feature.title}</h3>
                <p className="feature-card__desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" style={{ padding: '6rem 0', background: 'var(--surface-800)' }}>
        <div className="container">
          <div className="section-header">
            <span className="section-label">How It Works</span>
            <h2 className="section-title">Up and Running in Minutes</h2>
            <p className="section-subtitle">
              No complex setup. No IT team required. Just create, invite, and go.
            </p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', position: 'relative' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ position: 'relative' }}>
                {i < STEPS.length - 1 && (
                  <div style={{
                    display: 'none',
                  }} className="step-connector" />
                )}
                <div style={{
                  background: 'var(--surface-700)', border: '1px solid var(--surface-600)',
                  borderRadius: '1.25rem', padding: '2rem', height: '100%',
                }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 48, height: 48, borderRadius: '0.875rem',
                    background: 'linear-gradient(135deg, var(--primary-600), var(--primary-400))',
                    marginBottom: '1.25rem', color: 'white',
                  }}>
                    {step.icon}
                  </div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--primary-400)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    STEP {step.number}
                  </div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '0.75rem' }}>{step.title}</h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.65 }}>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sports */}
      <section id="sports" style={{ padding: '5rem 0' }}>
        <div className="container">
          <div className="section-header" style={{ marginBottom: '2.5rem' }}>
            <span className="section-label">Sports</span>
            <h2 className="section-title">Built for Every Sport</h2>
            <p className="section-subtitle">
              HuddleBase works for any team, any sport. The AI practice planner adapts its drills and structure to your specific game.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem', justifyContent: 'center' }}>
            {SPORTS.map((sport, i) => (
              <span key={i} style={{
                padding: '0.5rem 1.1rem', borderRadius: '2rem',
                background: 'var(--surface-800)', border: '1px solid var(--surface-600)',
                fontSize: '0.875rem', color: 'var(--text-secondary)',
                transition: 'all 0.2s',
              }}>
                {sport}
              </span>
            ))}
            <span style={{
              padding: '0.5rem 1.1rem', borderRadius: '2rem',
              background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.25)',
              fontSize: '0.875rem', color: 'var(--primary-400)', fontWeight: 600,
            }}>
              + more
            </span>
          </div>
        </div>
      </section>

      {/* Export / Import highlight strip */}
      <section style={{ padding: '4rem 0', background: 'var(--surface-800)', borderTop: '1px solid var(--surface-700)', borderBottom: '1px solid var(--surface-700)' }}>
        <div className="container">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2rem' }}>
            {[
              { icon: <Upload size={22} />, color: '#3b82f6', title: 'Bulk CSV Import', desc: 'Import your entire roster from a spreadsheet in one go. Maps name, email, role, jersey, position, and more.' },
              { icon: <Download size={22} />, color: '#22c55e', title: 'One-Click CSV Export', desc: 'Export roster, attendance, and financial data as CSV any time — for coaches, parents, or your club\'s records.' },
              { icon: <Star size={22} />, color: '#f59e0b', title: 'Effort Ratings', desc: 'Rate player effort after each session. Analytics track trends over time so you can reward improvement.' },
              { icon: <Shield size={22} />, color: '#8b5cf6', title: 'Role-Based Access', desc: 'Admins, coaches, players, and parents each see only what they need. No accidental data exposure.' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '0.75rem', flexShrink: 0,
                  background: `${item.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: item.color,
                }}>
                  {item.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.35rem' }}>{item.title}</div>
                  <div style={{ fontSize: '0.83rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card glass" style={{ position: 'relative', overflow: 'hidden' }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'radial-gradient(ellipse 60% 80% at 50% 100%, rgba(59,130,246,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ position: 'relative' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.35rem 0.9rem', borderRadius: '2rem',
                background: 'rgba(59,130,246,0.15)', border: '1px solid rgba(59,130,246,0.25)',
                color: 'var(--primary-400)', fontSize: '0.78rem', fontWeight: 600, marginBottom: '1.5rem',
              }}>
                <Zap size={12} /> Free to get started
              </span>
              <h2 className="cta-card__title">Your team deserves better tools.</h2>
              <p className="cta-card__desc">
                Join coaches who replaced five apps with one. Get your roster, schedule,
                payments, chat, and AI practice plans in a single dashboard — free.
              </p>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/register" className="btn btn-primary btn-lg" style={{ gap: '0.5rem' }}>
                  Create Your Team Free <ArrowRight size={18} />
                </Link>
                <Link href="/login" className="btn btn-outline btn-lg">
                  Already have an account?
                </Link>
              </div>
            </div>
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
              © 2026 HuddleBase. Built for coaches who hate admin work.
            </p>
            <Link href="/privacy" className="landing-footer__link">Privacy Policy</Link>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @media (max-width: 768px) {
          .ai-spotlight-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
