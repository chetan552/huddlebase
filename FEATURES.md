# HuddleBase — Competitive Feature Gap Analysis

> Generated: 2026-04-27  
> Compared against: TeamSnap, SportsEngine, GameChanger, LeagueApps

---

## Current Feature Status

| Feature | Status | Notes |
|---|---|---|
| Team Management | ✅ Full | Create, delete, multi-team support |
| Roster Management | ✅ Full | Add, remove, role/position/jersey tracking |
| Event Scheduling | ✅ Full | Create, calendar view, RSVP |
| Player Stats Recording | ✅ Full | Sport-specific metrics per event |
| Coach Feedback | ✅ Full | Effort rating + notes per player |
| Team Messaging | ✅ Partial | No live updates — fetches once on load |
| Announcements | ✅ Full | Priority levels, pinnable |
| Invoice / Payments | ✅ Partial | UI complete, payment processing is simulated (no Stripe) |
| Family / Parent Management | ✅ Full | Link parent to child, RSVP on their behalf |
| In-App Notifications | ✅ Partial | In-app only; email/push toggles exist but do nothing |
| Mobile App | ✅ Scaffold | Tab navigation + screens present, not fully featured |
| Attendance Tracking | ❌ Schema only | `Attendance` model exists in Prisma, zero UI |
| Recurring Events | ❌ Schema only | `Event.recurrence` JSON field exists, no UI |
| Document / Waiver Management | ❌ Schema only | `PlayerProfile.documents` array exists, no UI |
| CSV Roster Import | ❌ Not built | Listed on marketing copy, not implemented |
| Email Notifications | ❌ Not built | Toggle in Settings, backend does nothing |
| Analytics / Reporting | ❌ Not built | Data captured, no dedicated reporting page |
| CSV Export | ❌ Not built | No export for roster, attendance, or financials |
| Game Results / Scores | ❌ Not built | No score or win-loss tracking on GAME events |
| Real-time Chat | ❌ Not built | Polling-based; messages don't update without refresh |
| Event Cancellation Notifications | ❌ Not built | `isCancelled` flag exists, nobody is notified |
| Push Notifications | ❌ Not built | Toggle in Settings, no APNs/FCM integration |

---

## Critical Gaps
> Things competitors have that users expect on day one.

### 1. Real-time Chat
Chat fetches messages once on mount and never again. A coach message won't appear for a player until they navigate away and back.  
**Fix:** Poll every 5–10s on the chat page, or use Server-Sent Events.  
**Effort:** Low | **Impact:** High

### 2. Attendance UI
The `Attendance` Prisma model (present, arrivalTime, lateReason) is fully defined but there is no screen to use it. This is the #1 daily-use feature for coaches — "who showed up to practice?"  
**Fix:** Add an attendance marking screen per event (staff view) and an attendance history tab on the player profile.  
**Effort:** Medium | **Impact:** Very High

### 3. Recurring Events
`Event.recurrence` JSON field exists in the schema. Currently a coach must create 16 individual entries for a season of weekly practices.  
**Fix:** Add recurrence options (weekly, bi-weekly, daily) to the Create Event modal and a server-side expansion job.  
**Effort:** Medium | **Impact:** High

### 4. Email Notifications
Settings has Push Notifications and Email Updates toggles. The backend ignores both. Parents have no way to find out about cancelled games, upcoming events, or overdue invoices except by opening the app.  
**Fix:** Integrate [Resend](https://resend.com) or SendGrid. Trigger emails on: event created, event cancelled, invoice due, RSVP reminder 24h before event.  
**Effort:** Medium | **Impact:** Very High

### 5. Event Cancellation Notification
When `isCancelled` is set on an event, no notification or email is sent to team members. This is a trust-destroying gap.  
**Fix:** Fire a `CANCELLED_EVENT` notification (and email) to all team members when an event is cancelled via API.  
**Effort:** Low | **Impact:** High

---

## High-Value Gaps
> Features that would make coaches actively choose HuddleBase over competitors.

### 6. Analytics & Reporting Page
Data is being captured (RSVPs, stats, feedback, payments) but there is no analytics page. The `/analytics` route in NAV_ITEMS currently goes nowhere useful.  
**What to build:**
- Attendance % per player across a season
- Revenue by team / by month (bar chart)
- Player development trend (effort ratings over time, per player)
- Upcoming invoice summary  

**Effort:** Medium | **Impact:** High

### 7. CSV Export
No way to export any data. Common coach requests: roster for the school registrar, attendance report for the club director, payment ledger for the treasurer.  
**What to build:**
- `GET /api/roster?format=csv` — all team members
- `GET /api/invoices?format=csv` — payment ledger
- `GET /api/attendance?format=csv` — per-player attendance history  

**Effort:** Low | **Impact:** High

### 8. Game Results / Win-Loss Record
No way to record scores or track a season record. GameChanger is built entirely around this.  
**Fix:** Add `opponentName`, `homeScore`, `awayScore`, and `result` (WIN/LOSS/DRAW) fields to `GAME` type events. Show a season record (e.g., "8W – 3L – 1D") on the team card and dashboard.  
**Effort:** Low | **Impact:** High

### 9. Bulk CSV Roster Import
CLAUDE.md and marketing copy say "Import rosters via CSV" — but there is no implementation anywhere in the codebase.  
**Fix:** Add a CSV upload to the Roster page that maps columns (name, email, role, jersey, position) and bulk-creates team members.  
**Effort:** Medium | **Impact:** High

### 10. Document & Waiver Management
`PlayerProfile.documents` is a JSON array in the schema but entirely unbuilt in the UI. Every youth sports team needs signed liability waivers, medical release forms, and photo permissions.  
**Fix:** Add a Documents tab on the player profile page — upload, list, and download files per player.  
**Effort:** Medium | **Impact:** Medium

---

## Differentiating Features
> Things that could make HuddleBase *better* than established competitors.

### 11. AI Practice Plan Generator
No competitor does this well. Give coaches a form (sport, session duration, skill focus, age group) and generate a structured practice plan with warm-up, drills, and cooldown using the Claude API.  
**Effort:** Low–Medium (one API call) | **Impact:** Very High (unique differentiator)

### 12. Smart Availability Matcher
Before scheduling a practice, show "Tuesday at 6pm works for 14/16 players." Pull from player RSVP history and let players submit general weekly availability. TeamSnap has a dumb manual version — making it smart is a differentiator.  
**Effort:** High | **Impact:** High

### 13. Live Game Scoreboard
A public shareable URL showing the real-time game score via SSE. Parents who can't attend can follow along. No web competitor does this well — GameChanger is app-only.  
**Effort:** Medium | **Impact:** High (viral/shareable)

### 14. Real Stripe Payment Processing
The checkout modal collects a card number and does nothing with it. Parents cannot actually pay. Integrating Stripe Checkout or Payment Intents would immediately make the entire Payments section functional.  
**Effort:** Medium | **Impact:** Very High (currently the whole payments flow is a demo)

### 15. Jersey Number Conflict Detection
When adding a player with jersey #7, warn the coach if that number is already taken on the same team. Small touch, high perceived quality.  
**Effort:** Low | **Impact:** Medium

---

## Quick Wins (1–2 days each)

| # | Feature | Effort | Competitive Impact |
|---|---|---|---|
| 1 | Chat auto-refresh (5s polling on chat page) | Low | High |
| 2 | Event cancellation push notification to team | Low | High |
| 3 | CSV roster export endpoint + download button | Low | High |
| 4 | Jersey # conflict detection on player add | Low | Medium |
| 5 | Game score + opponent field on GAME events | Low | High |
| 6 | Season win-loss record on team card | Low | High |
| 7 | Attendance marking UI per event | Medium | Very High |
| 8 | Email via Resend on event create / cancel | Medium | Very High |
| 9 | Analytics page (attendance %, player effort trend) | Medium | High |
| 10 | CSV roster import (bulk upload) | Medium | High |

---

## Recommended Implementation Order

1. **Chat auto-refresh** — closes the most embarrassing gap with zero risk
2. **Email notifications (Resend)** — cancellations + 24h reminders; closes the biggest trust gap
3. **Attendance UI** — the #1 daily-use feature coaches are missing
4. **Game scores + season record** — quick wins that make the schedule feel real
5. **CSV export** — coaches ask for this on day one
6. **Analytics page** — turns captured data into visible value
7. **Stripe integration** — makes payments real instead of a demo
8. **Recurring events UI** — removes the most tedious manual work
9. **AI practice plan generator** — unique differentiator, low build cost
10. **CSV roster import** — delivers on the existing marketing promise

---

## The Single Biggest Competitive Liability

**No emails are sent from this app.** A parent joining TeamSnap gets email reminders before every event, instant cancellation alerts, and payment due notices. HuddleBase silently does nothing outside the app. Fixing email notifications (Resend integration, ~1 day) combined with the Attendance UI would close the trust gap with established players faster than any other investment.
