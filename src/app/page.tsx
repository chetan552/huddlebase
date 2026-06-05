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

const WORKFLOW = [
  {
    icon: <Upload size={18} />,
    title: 'Import roster',
    description: 'Bring players, parents, roles, jerseys, and positions in from one CSV.',
  },
  {
    icon: <Calendar size={18} />,
    title: 'Schedule the week',
    description: 'Create practices, games, and meetings with RSVP tracking built in.',
  },
  {
    icon: <Sparkles size={18} />,
    title: 'Generate the plan',
    description: 'Turn age group, sport, time, and skill focus into a ready-to-run session.',
  },
  {
    icon: <CheckCircle2 size={18} />,
    title: 'Track and export',
    description: 'Record attendance, effort, payments, and export the reports you need.',
  },
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
            <a href="#workflow" className="landing-nav__link">Workflow</a>
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
        <div className="hero__inner">
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
            </p>
            <div className="hero__actions">
              <Link href="/register" className="btn btn-primary btn-lg">
                Start Free — No Credit Card
                <ArrowRight size={18} />
              </Link>
              <Link href="/login" className="btn btn-outline btn-lg">
                Sign In
              </Link>
            </div>
            <div className="hero__social-proof">
              Built for <strong>coaches, parents, and players</strong> across 20+ sports
            </div>

            <div className="hero__quick-wins" aria-label="Key HuddleBase capabilities">
              {[
                { icon: <Sparkles size={13} />, text: 'AI Practice Plans' },
                { icon: <Upload size={13} />, text: 'CSV Import' },
                { icon: <Download size={13} />, text: 'CSV Export' },
                { icon: <Shield size={13} />, text: 'Role-Based Access' },
                { icon: <Clock size={13} />, text: 'Real-Time Chat' },
              ].map((b, i) => (
                <span key={i} className="hero__quick-win">
                  {b.icon} {b.text}
                </span>
              ))}
            </div>
          </div>

          <div className="hero-preview" aria-label="HuddleBase dashboard preview">
            <div className="hero-preview__topbar">
              <div>
                <div className="hero-preview__eyebrow">Tonight&apos;s Game</div>
                <div className="hero-preview__title">Falcons U14 vs. Rapids</div>
              </div>
              <span className="hero-preview__status">Live</span>
            </div>

            <div className="hero-preview__stats">
              {[
                { value: '18/22', label: 'Going' },
                { value: '$1.2k', label: 'Collected' },
                { value: '94%', label: 'Attendance' },
              ].map((stat) => (
                <div key={stat.label} className="hero-preview__stat">
                  <span>{stat.value}</span>
                  {stat.label}
                </div>
              ))}
            </div>

            <div className="hero-preview__panel">
              <div className="hero-preview__panel-head">
                <span>Practice Plan</span>
                <Sparkles size={15} />
              </div>
              {[
                { label: 'Warm-up', width: '44%' },
                { label: 'Passing circuit', width: '72%' },
                { label: 'Small-sided play', width: '58%' },
              ].map((item) => (
                <div key={item.label} className="hero-preview__row">
                  <span>{item.label}</span>
                  <div className="hero-preview__bar">
                    <span style={{ width: item.width }} />
                  </div>
                </div>
              ))}
            </div>

            <div className="hero-preview__activity">
              {[
                { icon: <Calendar size={14} />, text: 'Practice added for Thursday' },
                { icon: <MessageCircle size={14} />, text: 'Coach pinned a team update' },
                { icon: <CheckCircle2 size={14} />, text: 'Attendance export ready' },
              ].map((item) => (
                <div key={item.text} className="hero-preview__activity-item">
                  {item.icon}
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
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

      {/* Workflow */}
      <section id="workflow" className="workflow-section">
        <div className="container">
          <div className="workflow-shell">
            <div className="workflow-copy">
              <span className="section-label">Coach Workflow</span>
              <h2 className="section-title">From signup sheet to game day, without tool-hopping.</h2>
              <p className="section-subtitle workflow-copy__text">
                HuddleBase connects the weekly coaching loop, so roster updates, schedules,
                communication, practice planning, and reporting stay in one place.
              </p>
            </div>
            <div className="workflow-track">
              {WORKFLOW.map((step, i) => (
                <div key={step.title} className="workflow-step">
                  <div className="workflow-step__number">{String(i + 1).padStart(2, '0')}</div>
                  <div className="workflow-step__icon">{step.icon}</div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* AI Spotlight */}
      <section className="ai-spotlight-section">
        <div className="ai-spotlight-section__glow" />
        <div className="container">
          <div className="ai-spotlight-grid">
            <div>
              <span className="ai-spotlight-badge">
                <Sparkles size={12} /> AI Coach Assistant
              </span>
              <h2 className="ai-spotlight-title">
                Practice plans in seconds,<br />
                <span>not hours.</span>
              </h2>
              <p className="ai-spotlight-copy">
                Tell our AI your sport, age group, session length, and skill focus. Get back a
                complete practice plan with warm-ups, drills, progressions, scrimmage rules, and
                coaching cues — tailored to your team, ready to run.
              </p>
              <div className="ai-spotlight-list">
                {[
                  'Warm-up activities with timing',
                  'Skill drills with step-by-step setup',
                  'Progressions for advanced players',
                  'Scrimmage with rule modifications',
                  'Cool-down and reflection questions',
                ].map((item, i) => (
                  <div key={i} className="ai-spotlight-list__item">
                    <CheckCircle2 size={16} />
                    {item}
                  </div>
                ))}
              </div>
              <Link href="/register" className="btn btn-primary">
                <Sparkles size={15} /> Try AI Practice Plans Free
              </Link>
            </div>

            {/* Mock plan card */}
            <div className="practice-plan-card">
              <div className="practice-plan-card__header">
                <Sparkles size={16} />
                <span>Soccer Practice Plan — 60 min</span>
              </div>
              {[
                { section: '## Overview', lines: ['Build confidence in tight spaces through possession-based drills and small-sided play.'] },
                { section: '## Warm-Up (9 min)', lines: ['**Rondo Activation** (5 min): 4v2 in a 10×10 grid.', '**Dynamic Stretching** (4 min): Hip openers, leg swings, high knees.'] },
                { section: '## Skill Development (27 min)', lines: ['**1v1 Box Challenge** (10 min): Develop dribbling under pressure.', '**Passing Under Pressure** (17 min): Triangle passing with a defender.'] },
              ].map((block, i) => (
                <div key={i} className="practice-plan-card__block">
                  <div className="practice-plan-card__section">{block.section}</div>
                  {block.lines.map((line, j) => (
                    <div key={j} className="practice-plan-card__line">
                      {line.startsWith('**') ? (
                        <span>• <strong>{line.match(/\*\*([^*]+)\*\*/)?.[1]}</strong>{line.replace(/\*\*[^*]+\*\*/, '')}</span>
                      ) : line}
                    </div>
                  ))}
                </div>
              ))}
              <div className="practice-plan-card__status">
                <span />
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
                  <span className={`feature-card__badge${feature.highlight ? ' feature-card__badge--highlight' : ''}`}>
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
      <section id="how-it-works" className="steps-section">
        <div className="container">
          <div className="section-header">
            <span className="section-label">How It Works</span>
            <h2 className="section-title">Up and Running in Minutes</h2>
            <p className="section-subtitle">
              No complex setup. No IT team required. Just create, invite, and go.
            </p>
          </div>
          <div className="steps-grid">
            {STEPS.map((step, i) => (
              <div key={i} className="step-card-wrap">
                {i < STEPS.length - 1 && (
                  <div className="step-connector" />
                )}
                <div className="step-card">
                  <div className="step-card__icon">
                    {step.icon}
                  </div>
                  <div className="step-card__number">
                    STEP {step.number}
                  </div>
                  <h3>{step.title}</h3>
                  <p>{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Sports */}
      <section id="sports" className="sports-section">
        <div className="container">
          <div className="section-header section-header--compact">
            <span className="section-label">Sports</span>
            <h2 className="section-title">Built for Every Sport</h2>
            <p className="section-subtitle">
              HuddleBase works for any team, any sport. The AI practice planner adapts its drills and structure to your specific game.
            </p>
          </div>
          <div className="sports-list">
            {SPORTS.map((sport, i) => (
              <span key={i} className="sports-chip">
                {sport}
              </span>
            ))}
            <span className="sports-chip sports-chip--more">
              + more
            </span>
          </div>
        </div>
      </section>

      {/* Export / Import highlight strip */}
      <section className="highlights-section">
        <div className="container">
          <div className="highlights-grid">
            {[
              { icon: <Upload size={22} />, color: '#3b82f6', title: 'Bulk CSV Import', desc: 'Import your entire roster from a spreadsheet in one go. Maps name, email, role, jersey, position, and more.' },
              { icon: <Download size={22} />, color: '#22c55e', title: 'One-Click CSV Export', desc: 'Export roster, attendance, and financial data as CSV any time — for coaches, parents, or your club\'s records.' },
              { icon: <Star size={22} />, color: '#f59e0b', title: 'Effort Ratings', desc: 'Rate player effort after each session. Analytics track trends over time so you can reward improvement.' },
              { icon: <Shield size={22} />, color: '#8b5cf6', title: 'Role-Based Access', desc: 'Admins, coaches, players, and parents each see only what they need. No accidental data exposure.' },
            ].map((item, i) => (
              <div key={i} className="highlight-item">
                <div className="highlight-item__icon" style={{ color: item.color, background: `${item.color}18` }}>
                  {item.icon}
                </div>
                <div>
                  <div className="highlight-item__title">{item.title}</div>
                  <div className="highlight-item__desc">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="container">
          <div className="cta-card glass">
            <div className="cta-card__glow" />
            <div className="cta-card__content">
              <span className="cta-card__badge">
                <Zap size={12} /> Free to get started
              </span>
              <h2 className="cta-card__title">Your team deserves better tools.</h2>
              <p className="cta-card__desc">
                Join coaches who replaced five apps with one. Get your roster, schedule,
                payments, chat, and AI practice plans in a single dashboard — free.
              </p>
              <div className="cta-card__actions">
                <Link href="/register" className="btn btn-primary btn-lg">
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
            <div className="landing-footer__links">
              <a href="#features" className="landing-footer__link">Features</a>
              <a href="#workflow" className="landing-footer__link">Workflow</a>
              <Link href="/privacy" className="landing-footer__link">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
