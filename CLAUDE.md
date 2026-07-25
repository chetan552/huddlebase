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
│   ├── schedule/    # Calendar view (events, RSVP, recurring series)
│   ├── roster/      # Player/member management
│   ├── chat/        # Team channels, direct messages, group chats
│   ├── media/       # Photo & video galleries
│   ├── files/       # Team document repository
│   ├── availability/# Season-long away dates
│   ├── standings/   # Season records & head-to-head
│   ├── payments/    # Invoices, payment plans, treasury
│   ├── registration/# Signup forms & waivers (staff)
│   └── settings/    # User profile, calendar subscription
├── register-team/   # Public registration form (no auth)
└── api/             # REST API routes (~55+ endpoints)
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
| `src/lib/notify.ts` | `notifyUsers()` / `notifyTeam()` — the single fan-out point for in-app + email + push |
| `src/lib/timezone.ts` | Wall-clock ⇄ UTC conversion against IANA zones |
| `src/lib/recurrence.ts` | Recurring event rule parsing and expansion |
| `src/lib/availability.ts` | Availability blocks → auto-filled RSVPs |
| `src/lib/conversations.ts` | Conversation resolution and access control |
| `src/lib/ical.ts` | RFC 5545 calendar feed generation |
| `src/lib/push.ts` | Expo push delivery + stale token pruning |
| `src/lib/blob.ts` | Media/document type & size limits, storage config |
| `src/lib/venues.ts` | Venue formatting and map/directions links |
| `src/lib/standings.ts` | Season record aggregation and standings sort |
| `src/lib/assignments.ts` | Duty roles and fair-rotation planning |
| `src/lib/registration.ts` | Form schema parsing and answer validation |
| `src/lib/payments.ts` | Instalment splitting and treasury totals |
| `src/types/index.ts` | Shared TypeScript types across the app |

### Conventions worth knowing

- **Notifications**: never create `Notification` rows directly in a route — call `notifyUsers()` or `notifyTeam()` so in-app, email, and push stay in step.
- **Event times**: coaches enter wall-clock time; the API converts it against the team's `timezone` via `parseWallTime()`. Events store UTC instants. Never pass a datetime-local string to `new Date()` directly.
- **Recurring events** are materialised — each occurrence is a real `Event` row sharing a `seriesId`. Edits and deletes take a `scope` of `THIS | FUTURE | ALL`.
- **Messages** all belong to a `Conversation`. The team broadcast channel is created lazily by `getOrCreateTeamConversation()`.
- **RSVP `autoFilled`** marks answers written by an availability block. Explicit answers are never overwritten.
- **Money** always goes through `src/lib/payments.ts`. Split in integer cents via `splitAmount()` so instalments sum back exactly; never divide a float total.
- **Assignments vs volunteers**: `EventAssignment` is a duty *given* to someone (scorekeeper, referee); `EventVolunteerNeed` is a slot people *claim* (snacks). Both exist deliberately.
- **`autoAssigned`** marks rotation-created duties. Re-running a rotation replaces only those — hand-picked or accepted duties are left alone.
- **Waiver signatures** snapshot the waiver text at signing time; editing a form never changes what was already agreed to.

### Tests

```bash
npm run test:dates   # 76 assertions: timezone/DST, recurrence, rotation fairness,
                     # standings aggregation, money splitting, treasury totals
```

### Database Schema (Core Models)

- **User**: role is `ADMIN | COACH | PARENT | PLAYER`; holds `calendarToken` for the iCal feed
- **Team**: belongs to optional Club; has sport, season, color, logo, `timezone`
- **TeamMember**: join table linking User ↔ Team with role + jersey/position
- **Event**: type `PRACTICE | GAME | MEETING | OTHER`; `seriesId` groups recurring occurrences; optional `timezone` override
- **RSVP**: `GOING | MAYBE | NOT_GOING | PENDING` per user per event; `autoFilled` when set by an availability block
- **AvailabilityBlock**: a date range a user is away, scoped to one team or all
- **Conversation** / **ConversationParticipant**: `TEAM | DIRECT | GROUP` threads; `lastReadAt` drives unread counts
- **Message**: belongs to a Conversation; supports attachments, edits, soft delete
- **MessageReaction**: emoji reactions, unique per user per message
- **PushToken**: one row per device for Expo push
- **MediaAlbum** / **MediaItem**: team photo and video galleries
- **Venue**: saved locations with optional coordinates for precise directions
- **EventAssignment**: duty roster (scorekeeper, referee, setup) with `autoAssigned` rotation flag
- **TeamFile** / **TeamFileFolder**: document repository; `staffOnly` hides files from players and parents
- **RegistrationForm** / **RegistrationSubmission**: signup forms with a JSON `fields` schema
- **WaiverSignature**: typed-name e-signature snapshotting the waiver text agreed to
- **PaymentPlan**: a fee split into instalments, each generating its own Invoice
- **Invoice** / **Payment** / **Refund**: payment tracking; refunds are additive ledger rows, never deletions
- **PlayerStat**: JSON metrics per event (sport-specific)
- **PlayerProfile**: medical info, emergency contacts, documents
- **FamilyLink**: parent-child relationships with approval status
- **Notification**: types `NEW_EVENT | CANCELLED_EVENT | NEW_MESSAGE | NEW_MEDIA | INVOICE_DUE | TEAM_JOINED | SUPPORT_REQUEST`

After any schema change run `npx prisma generate` + `npx prisma db push`.

## Environment

Required env vars (see `.env.example`):
- `DATABASE_URL` — Supabase PostgreSQL connection string

Demo credentials (after seeding):
- Coach: `coach@huddlebase.com` / `password123`
- Player: `player1@huddlebase.com` / `password123`
- Parent: `parent1@huddlebase.com` / `password123`
