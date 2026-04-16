# ⚡ HuddleBase

**Your team command center — organize, communicate, and win together.** A full-stack team management platform for coaches, players, and parents — with a web dashboard and mobile app.

## Features

- **Dashboard** — Quick stats, upcoming events, and team activity at a glance
- **Teams** — Create and manage multiple teams with rosters
- **Schedule** — Full calendar with practices, games, and meetings
- **Chat** — Team messaging channels with real-time updates
- **Payments** — Invoice management with status tracking
- **Settings** — Profile management and preferences

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Web App** | Next.js 16, TypeScript, React 19 |
| **Mobile App** | React Native (Expo 54), TypeScript |
| **Database** | PostgreSQL (Supabase) via Prisma ORM |
| **Auth** | HTTP-only cookie sessions (web) + Bearer tokens (mobile) |
| **Styling** | Custom CSS with glassmorphism dark theme |

## Project Structure

```
TeamManagementApp/
├── src/                    # Next.js web app
│   ├── app/                # Pages & API routes
│   │   ├── api/            # REST API endpoints
│   │   │   ├── auth/       # Login, register, session
│   │   │   ├── teams/      # Team CRUD
│   │   │   ├── events/     # Event CRUD
│   │   │   ├── roster/     # Roster management
│   │   │   ├── messages/   # Team chat
│   │   │   └── invoices/   # Payment invoices
│   │   └── dashboard/      # Dashboard pages
│   └── lib/                # Shared utilities
├── mobile/                 # React Native (Expo) app
│   ├── app/                # Expo Router screens
│   │   ├── (tabs)/         # Bottom tab screens
│   │   ├── team/[id].tsx   # Team detail
│   │   ├── chat/[teamId].tsx # Chat messages
│   │   └── payments.tsx    # Invoice management
│   └── lib/                # API client, auth, theme
├── prisma/                 # Database schema & seed
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL database (Supabase free tier works)

### 1. Install & Set Up

```bash
# Clone and install
git clone <repo-url> && cd TeamManagementApp
npm install
```

Create a `.env` file in the project root:

```env
DATABASE_URL="postgresql://..."
```

```bash
# Generate Prisma client and push schema
npx prisma generate
npx prisma db push

# Seed demo data
npx prisma db seed
```

### 2. Run the Web App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use the demo account:
- **Email:** `coach@huddlebase.com`
- **Password:** `password123`

### 3. Run the Mobile App

```bash
cd mobile
npm install
npx expo start
```

Press **w** for web, **i** for iOS Simulator, or **a** for Android Emulator.

> **Note:** The backend must be running on `:3000` for the mobile app to fetch data.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | Login — returns session cookie (web) + token (mobile) |
| `POST` | `/api/auth/register` | Create account |
| `GET` | `/api/auth/me` | Current user session |
| `GET/POST` | `/api/teams` | List / create teams |
| `DELETE` | `/api/teams/[id]` | Delete team and all associated data |
| `GET/POST` | `/api/events` | List / create events |
| `GET/PATCH/DELETE` | `/api/events/[id]` | Get / update / delete event |
| `POST` | `/api/events/[id]/rsvp` | Submit RSVP for an event |
| `GET/POST` | `/api/roster` | List / add team members |
| `DELETE` | `/api/roster/[id]` | Remove member from team |
| `GET/POST` | `/api/messages` | List / send messages |
| `GET/POST` | `/api/announcements` | List / create announcements |
| `GET/POST` | `/api/invoices` | List / create invoices |
| `PATCH` | `/api/invoices/[id]` | Update invoice status |
| `GET/POST` | `/api/players/[id]/feedback` | Player feedback |
| `GET/POST` | `/api/players/[id]/stats` | Player stats |
| `GET/POST` | `/api/notifications` | List / manage notifications |
| `GET/POST` | `/api/family` | Parent–child family links |
| `POST` | `/api/upload` | Upload file (returns URL) |

All data endpoints accept both **cookie auth** (web) and **`Authorization: Bearer <token>`** (mobile).

## Deployment

The app is configured for [Vercel](https://vercel.com). Set `DATABASE_URL` in Vercel environment variables, then:

```bash
# Vercel runs this automatically on deploy
npm run vercel-build   # runs prisma migrate deploy && next build
```

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Coach | `coach@huddlebase.com` | `password123` |
| Player | `player1@huddlebase.com` | `password123` |
| Parent | `parent1@huddlebase.com` | `password123` |

## License

MIT
