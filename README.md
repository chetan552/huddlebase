<div align="center">

  <img src="public/screenshots/dark/dashboard.png" alt="HuddleBase Dashboard" width="100%" />

  # ⚡ HuddleBase

  **Your team command center — organize, communicate, and win together.**

  [![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
  [![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
  [![Expo](https://img.shields.io/badge/Expo-54-000020?logo=expo&logoColor=white)](https://expo.dev)
  [![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
  [![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

</div>

---

A full-stack team management platform for coaches, players, and parents — featuring a Next.js web dashboard and React Native (Expo) mobile app, both powered by a single REST API on PostgreSQL.

## Table of Contents

- [Screenshots](#screenshots)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Database](#database)
- [Architecture](#architecture)
- [Deployment](#deployment)

---

## Screenshots

<details open>
<summary><b>Dark theme</b></summary>
<br/>

| | | |
|---|---|---|
| [![Dashboard](public/screenshots/dark/dashboard.png)](public/screenshots/dark/dashboard.png) | [![Teams](public/screenshots/dark/teams.png)](public/screenshots/dark/teams.png) | [![Schedule](public/screenshots/dark/schedule.png)](public/screenshots/dark/schedule.png) |
| **Dashboard** | **Teams** | **Schedule** |
| [![Roster](public/screenshots/dark/roster.png)](public/screenshots/dark/roster.png) | [![Chat](public/screenshots/dark/chat.png)](public/screenshots/dark/chat.png) | [![Payments](public/screenshots/dark/payments.png)](public/screenshots/dark/payments.png) |
| **Roster** | **Chat** | **Payments** |
| [![Analytics](public/screenshots/dark/analytics.png)](public/screenshots/dark/analytics.png) | [![Practice Plan](public/screenshots/dark/practice-plan.png)](public/screenshots/dark/practice-plan.png) | |
| **Analytics** | **AI Practice Plan** | |

</details>

<details>
<summary><b>Light theme</b></summary>
<br/>

| | | |
|---|---|---|
| [![Dashboard](public/screenshots/light/dashboard.png)](public/screenshots/light/dashboard.png) | [![Teams](public/screenshots/light/teams.png)](public/screenshots/light/teams.png) | [![Schedule](public/screenshots/light/schedule.png)](public/screenshots/light/schedule.png) |
| **Dashboard** | **Teams** | **Schedule** |
| [![Roster](public/screenshots/light/roster.png)](public/screenshots/light/roster.png) | [![Chat](public/screenshots/light/chat.png)](public/screenshots/light/chat.png) | [![Payments](public/screenshots/light/payments.png)](public/screenshots/light/payments.png) |
| **Roster** | **Chat** | **Payments** |
| [![Analytics](public/screenshots/light/analytics.png)](public/screenshots/light/analytics.png) | [![Practice Plan](public/screenshots/light/practice-plan.png)](public/screenshots/light/practice-plan.png) | |
| **Analytics** | **AI Practice Plan** | |

</details>

---

## Features

<table>
<tr>
<td width="50%" valign="top">

### Team Management
- **Dashboard** — Aggregated stats, upcoming events, pending RSVPs, outstanding payments
- **Teams** — Create teams with sport, season, club, colors, and logos
- **Roster** — Manage members with jersey numbers, positions, categories, and CSV bulk import
- **Schedule** — Calendar with practices, games, meetings; recurring events, game results (W/L/D), opponent tracking, cancellations
- **Attendance** — Track presence, arrival time, and late reasons per event

### Communication
- **Chat** — Per-team messaging with in-app notifications and email alerts
- **Announcements** — Priority-pinned (urgent/high/normal/low) with automatic email delivery
- **Notifications** — Bell icon with unread badge (auto-polls every 15s), mark-read, backed by Resend email

</td>
<td width="50%" valign="top">

### Player Development
- **Player Stats** — Sport-specific metrics per event with coach feedback and 1–5 effort ratings
- **Player Profiles** — Medical notes, emergency contacts, allergies, document storage
- **Family Links** — Parent-child account linking with approval workflow

### Payments
- **Invoices** — Individual or bulk creation per player with CSV export
- **Payment Tracking** — Pending / paid / overdue / cancelled lifecycle
- **Checkout** — Stripe Checkout handoff for players and parents

### Intelligence
- **Analytics** — Attendance %, revenue trends, effort progression, invoice summaries (Chart.js)
- **AI Practice Plans** — OpenAI-generated structured practice plans with per-user monthly limits
- **Role-Based Access** — ADMIN, COACH, PARENT, PLAYER roles with navigation and API gating

</td>
</tr>
</table>

---

## Tech Stack

| Category | Technology | Version |
|---|---|---|
| **Framework** | [Next.js](https://nextjs.org) (App Router) | 16 |
| **UI** | [React](https://react.dev) | 19 |
| **Language** | [TypeScript](https://www.typescriptlang.org) | 5 |
| **Database** | [PostgreSQL](https://www.postgresql.org) via [Supabase](https://supabase.com) | — |
| **ORM** | [Prisma](https://www.prisma.io) | 6 |
| **Auth** | Custom HTTP-only cookies (web) + Base64 Bearer (mobile) | — |
| **Password** | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | 3 |
| **Styling** | Custom CSS — glassmorphism, CSS variables, dark/light themes | — |
| **Icons** | [Lucide React](https://lucide.dev) | 1 |
| **Charts** | [Chart.js](https://www.chartjs.org) + [react-chartjs-2](https://react-chartjs-2.js.org) | 4 / 5 |
| **Email** | [Resend](https://resend.com) — event, announcement, message, and invoice templates | 6 |
| **AI** | [OpenAI Responses API](https://platform.openai.com/docs/api-reference/responses) — structured practice plan generation | — |
| **Mobile** | [Expo](https://expo.dev) + [React Native](https://reactnative.dev) + [Expo Router](https://docs.expo.dev/router/introduction) | 54 / 0.81 / 6 |
| **Navigation** | [React Navigation](https://reactnavigation.org) | 7 |
| **Hosting** | [Vercel](https://vercel.com) (web) + Supabase (database) | — |

---

## Project Structure

```
TeamManagementApp/
├── src/
│   ├── app/
│   │   ├── (auth)/                  # Public: login, register
│   │   ├── (dashboard)/             # Protected pages (sidebar layout)
│   │   │   ├── dashboard/           # Home — stats, activity, role-based views
│   │   │   ├── teams/               # Team CRUD
│   │   │   ├── schedule/            # Calendar, events, RSVPs
│   │   │   ├── roster/              # Player management + [id] detail
│   │   │   ├── chat/                # Per-team messaging
│   │   │   ├── payments/            # Invoices + checkout
│   │   │   ├── analytics/           # Charts (ADMIN/COACH)
│   │   │   ├── practice-plan/       # AI-generated plans (ADMIN/COACH)
│   │   │   └── settings/            # User profile
│   │   └── api/                     # ~30 REST endpoints
│   ├── lib/                         # db, session, auth, email, utils, theme
│   ├── middleware.ts                # CORS proxy
│   └── types/                       # Shared TypeScript types
├── mobile/                          # React Native (Expo) app
│   ├── app/
│   │   ├── (tabs)/                  # Home, Teams, Calendar, Chat, More
│   │   ├── team/[id].tsx            # Team detail
│   │   ├── chat/[teamId].tsx        # Chat screen
│   │   ├── event/[id].tsx           # Event detail
│   │   └── payments.tsx             # Invoices
│   └── lib/                         # API client, auth provider
├── prisma/                          # Schema, seed, migrations
└── public/                          # Static assets + screenshots
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login — sets `session` cookie + returns Bearer token |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/logout` | Clear session |
| `GET` | `/api/auth/me` | Current user from session |
| `PUT` | `/api/auth/profile` | Update name, phone, avatar |

### Teams & Roster
| Method | Endpoint | Description |
|---|---|---|
| `GET` `POST` | `/api/teams` | List / create team |
| `GET` `PUT` `DELETE` | `/api/teams/[id]` | Single team CRUD |
| `GET` `POST` | `/api/roster` | List / add members |
| `GET` `PUT` `DELETE` | `/api/roster/[id]` | Single member ops |
| `POST` | `/api/roster/import` | Bulk CSV import |

### Events & Attendance
| Method | Endpoint | Description |
|---|---|---|
| `GET` `POST` | `/api/events` | List / create event |
| `GET` `PATCH` `DELETE` | `/api/events/[id]` | Single event (cancel, scores, opponent) |
| `GET` `POST` | `/api/events/[id]/rsvps` | RSVP submission |
| `GET` `POST` | `/api/events/[id]/attendance` | Attendance marking |

### Communication
| Method | Endpoint | Description |
|---|---|---|
| `GET` `POST` | `/api/messages` | List / send chat messages |
| `GET` `POST` | `/api/announcements` | List / create announcements |
| `GET` `PATCH` | `/api/notifications` | Fetch (unread filter) / mark read |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| `GET` `POST` | `/api/invoices` | List (`?format=csv`) / create |
| `GET` `PATCH` `DELETE` | `/api/invoices/[id]` | Single invoice (status update) |
| `POST` | `/api/invoices/bulk` | Multi-player invoice creation |

### Players & Family
| Method | Endpoint | Description |
|---|---|---|
| `GET` `POST` | `/api/players/[id]/stats` | Player stats |
| `GET` `POST` | `/api/players/[id]/feedback` | Coach feedback (1–5 rating) |
| `GET` `POST` | `/api/players/[id]/attendance` | Per-player attendance history |
| `GET` `POST` | `/api/family` | Parent-child family links |

### Other
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Aggregated dashboard stats |
| `GET` | `/api/analytics` | Chart data (ADMIN/COACH) |
| `POST` | `/api/practice-plan` | AI practice plan (OpenAI structured JSON) |
| `POST` | `/api/upload` | File upload |

All responses follow `{ success: boolean, data?, error? }`. Unauthenticated requests return `401`.

---

## Environment Variables

```env
# Required
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?pgbouncer=true&connection_limit=1"
SESSION_SECRET="replace-with-a-strong-random-secret"

# Optional — emails silently skip if unset
RESEND_API_KEY="re_xxxxxxxx"
FROM_EMAIL="notifications@huddlebase.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Optional — required for Stripe Checkout payments
STRIPE_SECRET_KEY="sk_live_xxxxxxxx"

# Optional — required for AI practice plans
OPENAI_API_KEY="sk-proj_xxxxxxxx"
AI_PRACTICE_PLAN_MODEL="gpt-5-mini"
AI_PRACTICE_PLAN_PREMIUM_MODEL="gpt-5.2"
AI_PRACTICE_PLAN_MONTHLY_LIMIT="30"
AI_PRACTICE_PLAN_MAX_OUTPUT_TOKENS="3000"
```

---

## Getting Started

### Prerequisites
- **Node.js** 18+ &nbsp;·&nbsp; **npm** &nbsp;·&nbsp; **PostgreSQL** (Supabase free tier works)

### 1. Install & Configure

```bash
git clone <repo-url> && cd TeamManagementApp
npm install
cp .env.example .env   # then set your DATABASE_URL
```

### 2. Setup Database

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 3. Run

```bash
npm run dev             # Web → http://localhost:3000
cd mobile && npm install && npx expo start   # Mobile (optional)
```

### Demo Accounts

| Role | Email | Password |
|---|---|---|
| Coach | `coach@huddlebase.com` | `password123` |
| Player | `player1@huddlebase.com` | `password123` |
| Parent | `parent1@huddlebase.com` | `password123` |

---

## Database

14 Prisma models on PostgreSQL:

| Model | Purpose |
|---|---|
| **User** | Central account — ADMIN, COACH, PARENT, or PLAYER |
| **Club** | Parent organization grouping teams |
| **Team** | Team with sport, season, branding |
| **TeamMember** | User ↔ Team join with role, jersey, position |
| **PlayerProfile** | Medical info, emergency contacts, documents |
| **Event** | PRACTICE / GAME / MEETING / OTHER — recurrence, scores, cancellation |
| **RSVP** | Per-user per-event status (GOING / MAYBE / NOT_GOING) |
| **Attendance** | Actual attendance with arrival time |
| **Message** | Team chat with threading support |
| **Announcement** | Coach posts with priority and pinning |
| **Invoice** | Billing — PENDING → PAID / OVERDUE / CANCELLED |
| **Payment** | Payment records with method tracking |
| **Notification** | In-app alerts — NEW_EVENT, NEW_MESSAGE, INVOICE_DUE, etc. |
| **PlayerStat** | JSON metrics per event (sport-agnostic) |
| **PlayerFeedback** | Coach-to-player effort ratings (1–5) |
| **FamilyLink** | Parent-child linking with approval |

After schema changes: `npx prisma generate && npx prisma db push`

---

## Architecture

**Authentication** — `getSessionUser()` reads from either an HTTP-only `session` cookie (web) or `Authorization: Bearer <token>` header (mobile). Both carry a Base64-encoded JSON user object with 7-day expiry. The `AuthProvider` React Context manages client-side state and is shared by both platforms.

**API Pattern** — All routes return `{ success: true, data }` or `{ success: false, error: "message" }` with appropriate HTTP status codes. CORS middleware allows localhost origins (8081, 19000, 19006) for Expo development.

**Styling** — CSS custom properties on `:root` (dark) and `[data-theme="light"]` (light). Glassmorphism effects via `backdrop-filter: blur()` with semi-transparent backgrounds. No Tailwind or component library.

**Mobile** — The Expo app at `/mobile` calls the same Next.js API routes. Auth tokens persist in AsyncStorage. File-based routing via Expo Router with a 5-tab bottom navigation layout.

---

## Deployment

Configured for [Vercel](https://vercel.com). Set the required environment variables, then deploy — `npm run vercel-build` runs migrations automatically.

```bash
npm run vercel-build   # prisma migrate deploy && next build
```

---

## License

MIT
