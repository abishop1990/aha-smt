# Aha SMT — Scrum Master Tool

A fast, focused Next.js app for day-to-day scrum master workflows powered by the [Aha REST API](https://www.aha.io/api). Built as a lightweight alternative to Aha's UI for the tasks scrum masters actually do every day.

## Features

- **Backlog Grooming** — View and filter unestimated features by release, assignee, and tags
- **Three-Criteria Estimation** — Score features across Scope, Complexity, and Unknowns with a suggested Fibonacci point value. Writes scores back to Aha. Keyboard shortcuts for fast flow.
- **Sprint Planning** — Per-member capacity vs allocation with days-off tracking. Visual capacity bars showing over/under-commitment.
- **Standup Tracking** — Daily standup entries with blocker aging (amber >2d, red >5d) and action item tracking
- **Sprint Metrics** — Capture sprint snapshots, track velocity over time, compare sprints side-by-side, and view per-member performance

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 — dark theme, no CSS-in-JS runtime
- TanStack React Query v5 — client-side caching
- Drizzle ORM + better-sqlite3 — local DB for standups, snapshots, days off
- recharts — velocity and metrics charts

## Getting Started

### Prerequisites

- Node.js 18+
- An Aha API token ([Settings > Personal > Developer](https://www.aha.io/api#authentication))

### Setup

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Aha domain and API token

# Start dev server
npm run dev
```

Open [http://localhost:3000/settings](http://localhost:3000/settings) to verify your Aha connection.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `AHA_DOMAIN` | Yes | Your Aha subdomain (e.g. `mycompany` for mycompany.aha.io) |
| `AHA_API_TOKEN` | Yes | API key from Aha Settings > Personal > Developer |
| `AHA_DEFAULT_PRODUCT_ID` | No | Auto-select a product on load |
| `DATABASE_URL` | No | SQLite path (default: `file:./data/aha-smt.db`) |
| `CACHE_TTL_SECONDS` | No | Server-side cache TTL (default: `60`) |

## Architecture

### Aha API Proxy

All Aha API calls go through Next.js Route Handlers (`/api/aha/*`) to keep the token server-side. Every request uses `?fields=...` to minimize payload size. Responses are cached in-memory with configurable TTL. A token-bucket rate limiter (20 req/sec burst, 300 req/min sustained) prevents hitting Aha's rate limits.

### Local Database

SQLite stores data that doesn't belong in Aha:
- **Standup entries** — daily updates per team member
- **Blockers & action items** — tracked across standups with aging and resolution
- **Sprint snapshots** — captured at sprint end for historical metrics
- **Estimation history** — criteria breakdown for calibration
- **Days off** — PTO and holidays affecting capacity calculations

Tables are auto-created on first run — no migration step needed.

### Sprints as Releases

The Aha REST API has no dedicated sprint/iteration endpoints. This tool models sprints as Aha Releases with start and end dates.

## Project Structure

```
src/
├── app/              # Pages and API route handlers
├── components/
│   ├── ui/           # Base UI components (button, card, table, etc.)
│   ├── layout/       # App shell, sidebar, header
│   ├── backlog/      # Backlog table and filters
│   ├── estimate/     # Estimation queue, criteria scorer, point picker
│   ├── sprint/       # Capacity bars, allocation table, days off
│   ├── metrics/      # Velocity chart, KPI cards, comparisons
│   ├── standup/      # Standup form, timeline, blocker tracker
│   └── shared/       # Feature badge, avatar, data table, empty state
├── hooks/            # React Query hooks for all data fetching
├── lib/              # Aha client, cache, rate limiter, DB, types
└── providers/        # TanStack Query provider
```

## License

MIT
