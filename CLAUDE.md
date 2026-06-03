# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**HuddleBase** — a full-stack team management platform for coaches, players, and parents. Provides a Next.js web dashboard and a React Native (Expo) mobile app sharing the same backend.

## Commands

```bash
# Development
npm run dev              # Start Next.js dev server (port 3000)
npm run build            # Production build
npm run start            # Production server
npm run eslint           # ESLint

# Database (Prisma)
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma db push       # Apply schema changes to the database
npx prisma db seed       # Seed demo data
npm run vercel-build     # Runs migrations then builds (used in CI/Vercel)

# Mobile (from /mobile directory)
npx expo start           # Start Expo dev server
```

## Architecture

### Stack

- **Web**: Next.js 16 (App Router), React 19, TypeScript 5
- **Mobile**: Expo 54, React Native, Expo Router 6
- **Database**: PostgreSQL (Supabase) via Prisma ORM 6
- **Auth**: Custom session auth — HTTP-only cookies (web) + Base64 Bearer tokens (mobile)
- **Styling**: Custom CSS with glassmorphism dark theme (no UI framework)
- **Charts**: Chart.js + react-chartjs-2
- **Icons**: Lucide React

### Route Groups

```
src/app/
├── (auth)/          # Login, register pages (public)
├── (dashboard)/     # Protected pages sharing dashboard layout
│   ├── dashboard/   # Home with stats and activity
│   ├── teams/       # Team management
│   ├── schedule/    # Calendar view (events, RSVP)
│   ├── roster/      # Player/member management
│   ├── chat/        # Team messaging
│   ├── payments/    # Invoice tracking
│   └── settings/    # User profile settings
└── api/             # REST API routes (~25+ endpoints)
```

### Authentication

Dual auth in `src/lib/session.ts` via `getSessionUser()`:
- **Web**: Reads `session` HTTP-only cookie containing a Base64-encoded JSON user object
- **Mobile**: Reads `Authorization: Bearer <token>` header with same encoding

All protected API routes call `getSessionUser(request)` and return 401 if null. The `AuthProvider` React Context (`src/lib/auth.tsx`) manages client-side auth state for the web dashboard.

### API Pattern

All API routes follow this structure:

```ts
// Success
return NextResponse.json({ success: true, data: ... })

// Error
return NextResponse.json({ success: false, error: "message" }, { status: 400 | 401 | 500 })
```

CORS middleware (`src/middleware.ts`) allows localhost origins 8081, 19000, 19006 for mobile development.

### Key Library Files

| File | Purpose |
|------|---------|
| `src/lib/db.ts` | Prisma singleton — always import from here |
| `src/lib/session.ts` | `getSessionUser()` — auth extraction for API routes |
| `src/lib/auth.tsx` | React Context + `useAuth()` hook for web pages |
| `src/lib/utils.ts` | Formatting and styling helpers |
| `src/types/index.ts` | Shared TypeScript types across the app |

### Database Schema (Core Models)

- **User**: role is `ADMIN | COACH | PARENT | PLAYER`
- **Team**: belongs to optional Club; has sport, season, color, logo
- **TeamMember**: join table linking User ↔ Team with role + jersey/position
- **Event**: type `PRACTICE | GAME | MEETING | OTHER`; supports recurring events
- **RSVP**: `GOING | MAYBE | NOT_GOING | PENDING` per user per event
- **Message**: team chat, supports threading
- **Invoice** / **Payment**: payment tracking
- **PlayerStat**: JSON metrics per event (sport-specific)
- **PlayerProfile**: medical info, emergency contacts, documents
- **FamilyLink**: parent-child relationships with approval status
- **Notification**: types `NEW_EVENT | NEW_MESSAGE | INVOICE_DUE | TEAM_JOINED`

After any schema change run `npx prisma generate` + `npx prisma db push`.

## Environment

Required env vars (see `.env.example`):
- `DATABASE_URL` — Supabase PostgreSQL connection string

Demo credentials (after seeding):
- Coach: `coach@huddlebase.com` / `password123`
- Player: `player1@huddlebase.com` / `password123`
- Parent: `parent1@huddlebase.com` / `password123`
