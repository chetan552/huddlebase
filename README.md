# ⚡ HuddleBase

**Your team command center — organize, communicate, and win together.** A full-stack team management platform for coaches, players, and parents — with a Next.js web dashboard and React Native (Expo) mobile app sharing a single backend.

## Features

### Team Management
- **Dashboard** — Aggregated stats: teams, players, upcoming events, pending RSVPs, outstanding payments
- **Teams** — Create and manage teams with sport, season, club, colors, and logos
- **Roster** — Manage team members with jersey numbers, positions, and categories; CSV bulk import
- **Schedule** — Full calendar with practices, games, meetings; recurring events, game results (win/loss/draw), opponent tracking, cancellations
- **Attendance** — Track who showed up, arrival time, and late reasons per event

### Communication
- **Chat** — Per-team messaging with in-app notifications and email alerts
- **Announcements** — Priority-pinned announcements (urgent/high/normal/low) with email delivery
- **Notifications** — In-app notification bell (auto-polls every 15s) with mark-read, backed by email via Resend

### Player Development
- **Player Stats** — Per-event sport-specific metrics (JSON) with coach feedback and 1–5 effort ratings
- **Player Profiles** — Medical notes, emergency contacts, allergies, document storage
- **Family Links** — Parent-child account linking with approval workflow

### Payments
- **Invoices** — Create individual or bulk invoices per player; CSV export
- **Payment Tracking** — Pending / paid / overdue / cancelled statuses; collection summaries
- **Checkout** — Simulated secure card checkout for players and parents

### Intelligence
- **Analytics** — Attendance %, revenue trends, effort progression, invoice summaries (Charts.js)
- **AI Practice Plans** — Gemini-generated practice plans with streaming response
- **Role-Based Access** — ADMIN, COACH, PARENT, PLAYER roles with navigation and API gating

---

## Screenshots

| | | |
|---|---|---|
| [![Dashboard](public/screenshots/dashboard.png)](public/screenshots/dashboard.png) | [![Teams](public/screenshots/teams.png)](public/screenshots/teams.png) | [![Schedule](public/screenshots/schedule.png)](public/screenshots/schedule.png) |
| **Dashboard** | **Teams** | **Schedule** |
| [![Roster](public/screenshots/roster.png)](public/screenshots/roster.png) | [![Chat](public/screenshots/chat.png)](public/screenshots/chat.png) | [![Payments](public/screenshots/payments.png)](public/screenshots/payments.png) |
| **Roster** | **Chat** | **Payments** |
| [![Analytics](public/screenshots/analytics.png)](public/screenshots/analytics.png) | [![Practice Plan](public/screenshots/practice-plan.png)](public/screenshots/practice-plan.png) | |
| **Analytics** | **AI Practice Plan** | |

---

## Tech Stack

### Web App

| Layer | Technology |
|---|---|
| **Framework** | [Next.js 16](https://nextjs.org) (App Router) |
| **UI Library** | [React 19](https://react.dev) |
| **Language** | [TypeScript 5](https://www.typescriptlang.org) |
| **Database** | [PostgreSQL](https://www.postgresql.org) via [Supabase](https://supabase.com) |
| **ORM** | [Prisma 6](https://www.prisma.io) |
| **Auth** | Custom session auth — HTTP-only cookies (web) + Base64 Bearer tokens (mobile) |
| **Password Hashing** | [bcryptjs](https://github.com/dcodeIO/bcrypt.js) |
| **Styling** | Custom CSS with glassmorphism dark/light theme (CSS variables, no framework) |
| **Charts** | [Chart.js 4](https://www.chartjs.org) + [react-chartjs-2](https://react-chartjs-2.js.org) |
| **Icons** | [Lucide React](https://lucide.dev) |
| **Email** | [Resend](https://resend.com) with HTML templates for events, announcements, messages, invoices |
| **AI** | [Google Gemini SDK](https://ai.google.dev) for practice plan generation |
| **Validation** | Manual (no Zod — PRs welcome) |

### Mobile App

| Layer | Technology |
|---|---|
| **Framework** | [React Native 0.81](https://reactnative.dev) |
| **Platform** | [Expo 54](https://expo.dev) (managed workflow) |
| **Router** | [Expo Router 6](https://docs.expo.dev/router/introduction) (file-based) |
| **Navigation** | [React Navigation 7](https://reactnavigation.org) |
| **Storage** | [AsyncStorage](https://react-native-async-storage.github.io/async-storage) |
| **Animations** | [React Native Reanimated 4](https://docs.swmansion.com/react-native-reanimated) |

### Shared Infrastructure

| Layer | Technology |
|---|---|
| **Hosting** | [Vercel](https://vercel.com) (web), Supabase (database) |
| **API Style** | REST — JSON responses with `{ success, data, error }` shape |
| **CORS** | Custom proxy allowing localhost:8081, 19000, 19006 (Expo dev) |
| **Sessions** | 7-day expiry, SameSite=lax |

---

## Project Structure

```
TeamManagementApp/
├── src/                          # Next.js web app
│   ├── app/
│   │   ├── (auth)/               # Public: login, register
│   │   ├── (dashboard)/          # Protected pages with shared sidebar layout
│   │   │   ├── dashboard/        # Home with stats, activity, role-specific views
│   │   │   ├── teams/            # Team CRUD
│   │   │   ├── schedule/         # Calendar, events, RSVPs
│   │   │   ├── roster/           # Player management + [id] detail
│   │   │   ├── chat/             # Per-team messaging
│   │   │   ├── payments/         # Invoices, checkout
│   │   │   ├── analytics/        # Charts (ADMIN/COACH only)
│   │   │   ├── practice-plan/    # AI-generated plans (ADMIN/COACH only)
│   │   │   └── settings/         # User profile
│   │   └── api/                  # ~30 REST endpoints (see below)
│   ├── lib/
│   │   ├── db.ts                 # Prisma singleton
│   │   ├── session.ts            # getSessionUser() — dual cookie + Bearer auth
│   │   ├── auth.tsx              # React Context (AuthProvider + useAuth hook)
│   │   ├── email.ts              # Resend client + HTML email templates
│   │   ├── utils.ts              # Formatting, CSV export
│   │   ├── constants.ts          # NAV_ITEMS with role gating
│   │   └── useTheme.ts          # Dark/light theme hook (useSyncExternalStore)
│   ├── middleware.ts              # CORS proxy for mobile dev
│   └── types/index.ts            # Shared TypeScript types
├── mobile/                       # React Native (Expo) app
│   ├── app/
│   │   ├── (tabs)/               # Bottom tabs: Home, Teams, Calendar, Chat, More
│   │   ├── team/[id].tsx         # Team detail screen
│   │   ├── chat/[teamId].tsx     # Chat screen
│   │   ├── event/[id].tsx        # Event detail
│   │   ├── payments.tsx          # Invoice management
│   │   ├── login.tsx             # Login screen
│   │   └── register.tsx          # Registration screen
│   └── lib/                      # API client, auth provider, theme
├── prisma/
│   ├── schema.prisma             # 14 models (User, Team, Event, Message, etc.)
│   ├── seed.ts                   # Demo data seeder
│   └── migrations/               # DB migration history
├── .env.example                  # Required environment variables
├── CLAUDE.md                     # Claude Code project guide
└── FEATURES.md                   # Competitive analysis & feature roadmap
```

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login — sets `session` cookie (web) + returns Bearer token (mobile) |
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/logout` | Clear session |
| `GET` | `/api/auth/me` | Current user from session |
| `PUT` | `/api/auth/profile` | Update name, phone, avatar |

### Teams & Roster
| Method | Endpoint | Description |
|---|---|---|
| `GET / POST` | `/api/teams` | List all / create team |
| `GET / PUT / DELETE` | `/api/teams/[id]` | Single team CRUD |
| `GET / POST` | `/api/roster` | List / add team members |
| `GET / PUT / DELETE` | `/api/roster/[id]` | Single member operations |
| `POST` | `/api/roster/import` | Bulk CSV import (finds-or-creates users) |

### Events & Attendance
| Method | Endpoint | Description |
|---|---|---|
| `GET / POST` | `/api/events` | List / create event |
| `GET / PATCH / DELETE` | `/api/events/[id]` | Single event (PATCH for cancel, scores, opponent) |
| `GET / POST` | `/api/events/[id]/rsvps` | Get / submit RSVPs |
| `GET / POST` | `/api/events/[id]/attendance` | Mark attendance per event |

### Communication
| Method | Endpoint | Description |
|---|---|---|
| `GET / POST` | `/api/messages` | List / send team chat messages |
| `GET / POST` | `/api/announcements` | List / create team announcements |
| `GET / PATCH` | `/api/notifications` | Fetch (with `?unread=true`) / mark read |

### Payments
| Method | Endpoint | Description |
|---|---|---|
| `GET / POST` | `/api/invoices` | List (with `?format=csv`) / create invoice |
| `GET / PATCH / DELETE` | `/api/invoices/[id]` | Single invoice (PATCH for status) |
| `POST` | `/api/invoices/bulk` | Create invoices for multiple players |

### Players & Family
| Method | Endpoint | Description |
|---|---|---|
| `GET / POST` | `/api/players/[id]/stats` | Player performance stats |
| `GET / POST` | `/api/players/[id]/feedback` | Coach feedback + effort rating |
| `GET / POST` | `/api/players/[id]/attendance` | Per-player attendance history |
| `GET / POST` | `/api/family` | Parent-child family links |

### Other
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard` | Aggregated stats for dashboard cards |
| `GET` | `/api/analytics` | Chart data (ADMIN/COACH only) |
| `POST` | `/api/practice-plan` | AI-generated practice plan via Gemini (streaming) |
| `POST` | `/api/upload` | File upload (returns URL) |

All protected endpoints return `401` if unauthenticated. Responses follow `{ success: boolean, data?, error? }`.

---

## Environment Variables

```env
# Required
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?pgbouncer=true&connection_limit=1"

# Email (Resend) — optional, emails silently skip if unset
RESEND_API_KEY="re_xxxxxxxx"
FROM_EMAIL="notifications@huddlebase.com"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Supabase free tier works)

### 1. Install & Configure

```bash
git clone <repo-url> && cd TeamManagementApp
npm install
```

Copy `.env.example` to `.env` and set your `DATABASE_URL`.

### 2. Setup Database

```bash
npx prisma generate
npx prisma db push
npx prisma db seed
```

### 3. Run the Web App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Demo accounts:

| Role | Email | Password |
|---|---|---|
| Coach | `coach@huddlebase.com` | `password123` |
| Player | `player1@huddlebase.com` | `password123` |
| Parent | `parent1@huddlebase.com` | `password123` |

### 4. Run the Mobile App (optional)

```bash
cd mobile
npm install
npx expo start
```

Press **w** for web, **i** for iOS Simulator, or **a** for Android Emulator. The backend must be running on `:3000`.

---

## Database

14 Prisma models covering the full domain:

| Model | Purpose |
|---|---|
| **User** | Central account (ADMIN / COACH / PARENT / PLAYER) |
| **Club** | Parent organization grouping teams |
| **Team** | Team entity with sport, season, branding |
| **TeamMember** | Join table — User ↔ Team with role, jersey, position |
| **PlayerProfile** | Medical info, emergency contacts, documents |
| **Event** | PRACTICE / GAME / MEETING / OTHER with recurrence, scores, cancellation |
| **RSVP** | Per-user per-event status (GOING / MAYBE / NOT_GOING) |
| **Attendance** | Actual attendance tracking with arrival time |
| **Message** | Team chat with threading support |
| **Announcement** | Coach-posted announcements with priority + pin |
| **Invoice** | Billing with status lifecycle (PENDING → PAID / OVERDUE / CANCELLED) |
| **Payment** | Payment records with method tracking |
| **Notification** | In-app alerts (NEW_EVENT, NEW_MESSAGE, INVOICE_DUE, etc.) |
| **PlayerStat** | JSON metrics per event (sport-agnostic) |
| **PlayerFeedback** | Coach-to-player effort ratings (1–5) |
| **FamilyLink** | Parent-child account linking with approval |

After schema changes: `npx prisma generate && npx prisma db push`

---

## Architecture Notes

**Authentication flow**: `getSessionUser()` in `src/lib/session.ts` reads from either the `session` HTTP-only cookie (web) or `Authorization: Bearer <token>` header (mobile). Both carry a Base64-encoded JSON user object. The `AuthProvider` React Context (`src/lib/auth.tsx`) manages client-side auth state and is shared by both web and mobile.

**API pattern**: Every route follows `NextResponse.json({ success: true, data })` for success and `{ success: false, error: "message" }` with an HTTP status for errors. CORS middleware allows localhost origins for Expo development.

**Styling**: Custom CSS with CSS custom properties (variables) on `:root` and `[data-theme="light"]`. Glassmorphism effects via `backdrop-filter: blur()` with semi-transparent backgrounds. No Tailwind, no UI component library.

**Mobile sharing**: The mobile app at `/mobile` calls the same Next.js API routes. Auth tokens are stored in AsyncStorage. Navigation uses Expo Router's file-based routing with a bottom tab layout.

---

## Deployment

Configured for [Vercel](https://vercel.com). Set the required environment variables, then:

```bash
# Vercel runs this automatically on deploy
npm run vercel-build   # prisma migrate deploy && next build
```

---

## License

MIT
