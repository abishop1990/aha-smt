# Aha SMT — Scrum Master Tools

## The Problem

Aha.io is a powerful product management platform, but its UI is slow and bloated for the workflows a scrum master runs through every day. Loading a single backlog view can take seconds. Estimating features means clicking through multiple screens. There's no quick way to see who's over-committed in a sprint, track standup blockers over time, or compare velocity across sprints without exporting to a spreadsheet.

Scrum masters need a small, fast set of tools — not the full product management suite. Aha SMT pulls data from Aha via its REST API and presents focused views for the things that matter during a sprint: what needs estimating, who has capacity, what's blocking people, and how the team is trending.

## Features

- **Backlog Grooming** — View and filter unestimated features by release, assignee, and tags
- **Three-Criteria Estimation** — Score features across Scope, Complexity, and Unknowns with a suggested point value. Writes scores back to Aha. Keyboard shortcuts for fast flow.
- **Sprint Planning** — Per-member capacity vs allocation with days-off tracking. Visual capacity bars showing over/under-commitment. Supports both Aha iterations and releases.
- **Standup Tracking** — Daily standup entries with blocker aging (amber >2d, red >5d) and action item tracking
- **Sprint Metrics** — Capture sprint snapshots, track velocity over time, compare sprints side-by-side, and view per-member performance
- **Org Configuration** — Externalized config for point source priority, estimation scale, sprint mode, workflow statuses, and the estimation matrix. Customize per org without forking.

## Tech Stack

- Next.js 15 (App Router) + React 19 + TypeScript
- Tailwind CSS 4 — dark theme, no CSS-in-JS runtime
- TanStack React Query v5 — client-side caching
- Drizzle ORM + better-sqlite3 — local DB for standups, snapshots, days off
- recharts — velocity and metrics charts
- Vitest — 249 tests across 19 test files

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

# Create org config (edit to customize)
cp aha-smt.config.example.ts aha-smt.config.ts

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
| `AHA_TEAM_PRODUCT_ID` | No | Aha Develop team workspace ID for iteration support |
| `DATABASE_URL` | No | SQLite path (default: `file:./data/aha-smt.db`) |
| `CACHE_TTL_SECONDS` | No | Server-side cache TTL (default: `60`) |

### Org Configuration

`aha-smt.config.ts` controls org-specific behavior. The file is gitignored — each deployment maintains its own copy. Copy `aha-smt.config.example.ts` to get started; the app works out of the box with defaults.

| Setting | Default | Description |
|---|---|---|
| `points.source` | `["original_estimate", "score"]` | Priority order for extracting points from a feature. First non-null value wins. |
| `points.scale` | `[1, 2, 3, 5, 8, 13, 21]` | Point values shown in the estimation UI |
| `points.defaultPerDay` | `1` | Starting default for points-per-day capacity (overridable in Settings) |
| `sprints.mode` | `"both"` | `"iterations"`, `"releases"`, or `"both"` |
| `sprints.defaultView` | `"iterations"` | Default tab when mode is `"both"` |
| `workflow.completeMeanings` | `["DONE", "SHIPPED"]` | Aha `internalMeaning` values that count as complete |
| `estimation.matrix` | See example file | Scope/Complexity/Unknowns → Points lookup (keys like `"L-M-H"`) |

Example customization:

```typescript
import { defineConfig } from "@/lib/config";

export default defineConfig({
  points: {
    source: ["original_estimate"],
    scale: [0.5, 1, 2, 3, 5, 8, 13],
  },
  sprints: {
    mode: "iterations",
  },
  workflow: {
    completeMeanings: ["DONE"],
  },
});
```

Only include the settings you want to override — everything else falls back to defaults via deep merge.

## Commands

```bash
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build (verifies TypeScript + ESLint)
npm test             # Run all tests (vitest)
npm run test:watch   # Watch mode
npm run bench        # Run micro-benchmarks (vitest bench)
npx tsx benchmarks/live-api-benchmark.ts  # Live Aha API latency test
```

## Architecture

### Aha API Proxy

All Aha API calls go through Next.js Route Handlers (`/api/aha/*`) to keep the token server-side. Every request uses `?fields=...` to minimize payload size. Responses are cached in-memory with configurable TTL. A token-bucket rate limiter (20 req/sec burst, 300 req/min sustained) prevents hitting Aha's rate limits.

### Dual API: REST v1 + GraphQL v2

The Aha REST API v1 handles most data (releases, features, users, products). However, the REST API has **no support for iteration-feature linkage** — the `?iteration=` filter is silently ignored, and features don't have an iteration field. For sprint/iteration data, we use the **Aha GraphQL v2 API** (`/api/v2/graphql`), which returns iterations with their linked features in a single request.

| API | Used for | Why |
|---|---|---|
| REST v1 | Releases, features, users, products, auth | Mature, well-documented, fine for non-iteration data |
| GraphQL v2 | Iterations + their features | Only way to get iteration→feature linkage; 87% faster for sprint planning |

### Local Database

SQLite stores data that doesn't belong in Aha:
- **Standup entries** — daily updates per team member
- **Blockers & action items** — tracked across standups with aging and resolution
- **Sprint snapshots** — captured at sprint end for historical metrics
- **Estimation history** — criteria breakdown for calibration
- **Days off** — PTO and holidays affecting capacity calculations
- **Settings** — per-instance preferences (e.g. points-per-day overrides)

Tables are auto-created on first run — no migration step needed.

### Config System

Org-specific behavior is externalized into `aha-smt.config.ts` at the project root. The `defineConfig()` helper provides type checking and IDE autocomplete. At runtime, `getConfig()` deep-merges the user config over `DEFAULT_CONFIG` and caches the result as a singleton.

The config drives:
- **Point extraction** — `points.ts` iterates the configured `source` array instead of hardcoded `original_estimate ?? score`
- **Estimation UI** — point picker and suggested-points matrix read from config
- **Sprint mode** — sprint list page shows iterations, releases, or both with a toggle
- **Workflow completion** — GraphQL feature mapping uses configured `completeMeanings`

## Aha! API Latency & Limitations

The Aha! APIs are the primary bottleneck for responsiveness. We measured production latency against a real Aha! environment and applied every mitigation available, but some constraints are outside our control.

### What we measured

#### REST API v1

| Endpoint | Avg Latency | p95 | Notes |
|---|---|---|---|
| `/me` (auth check) | ~430ms | ~600ms | Cold-start spikes to 700ms+ |
| `/products` | ~185ms | ~195ms | Small payload |
| `/releases` (per product) | ~260ms | ~390ms | Varies with release count |
| `/features` (200 items, lean fields) | ~1.2s | ~1.5s | Full fields (incl. description): ~1.8s |
| `/features` (full pagination, 3400 items) | ~29s | ~36s | 17 sequential pages at 200/page |
| `/features/:id` (single detail) | ~215ms | ~225ms | With description + requirements |
| `/users` (per product) | ~270ms | ~420ms | 30 users |
| `/iterations` (list only, no features) | ~440ms | ~485ms | 21 iterations; cannot link features |

#### GraphQL v2

| Query | Avg Latency | p95 | Notes |
|---|---|---|---|
| Schema introspection | ~210ms | ~225ms | Baseline GraphQL overhead |
| All iterations + features (21 sprints, 1626 features) | ~2.7s | ~3.2s | Single request returns everything |
| Single iteration page + features | ~3.2s | ~3.3s | Full feature details per iteration |

#### End-to-end flows

| Flow | Avg Latency | Notes |
|---|---|---|
| Dashboard (sequential: me → products → releases) | ~860ms | 3 serial REST calls |
| Dashboard (parallel: `Promise.all`) | ~640ms | 26% faster |
| Sprint planning — REST (releases → features → detail) | ~1.7s | 3 sequential REST calls |
| Sprint planning — GraphQL (single iteration query) | ~220ms | **87% faster** than REST; 1 call |
| Estimation flow (releases → unestimated features) | ~1.6s | REST, client-side filter |

### Hard limits we can't change

- **REST v1 can't filter features by iteration.** The `?iteration=` parameter is silently ignored. Features have no `iteration` field. The only way to get iteration→feature linkage is through the GraphQL v2 API.
- **No batch/bulk API.** Aha! has no endpoint to fetch multiple resources in one call. Every feature, release, or user list is a separate HTTP request.
- **No webhooks or push.** There's no way to subscribe to changes. We must poll or rely on cache TTLs.
- **~200-400ms base latency per call.** Even minimal payloads take 200-400ms. This is Aha!'s server-side processing time.
- **Sequential pagination (REST).** Large releases with 1000+ features will always be slow on first load.
- **`/project_teams` unavailable on some plans.** The teams endpoint returns 404 on certain Aha! subscription tiers.
- **Field filtering helps but has limits.** Using `?fields=` cuts response size 30-60%, but the API still processes the full query server-side.

### What we do about it

| Strategy | Impact |
|---|---|
| GraphQL v2 for iterations | 87% faster sprint planning; only way to get iteration→feature data |
| Composite server endpoints (`/api/aha/iteration-data`, etc.) | Collapse 3-5 client round-trips into 1 |
| `Promise.all` parallel fan-out | 26% faster than sequential for dashboard |
| Lean `?fields=` on every REST call | 30-60% response size reduction |
| Stale-while-revalidate caching | Instant loads on revisit, background refresh |
| Tiered cache TTLs (teams 10min, iterations 2min, features 1min) | Match cache duration to data volatility |
| Request deduplication | Concurrent identical GETs share one in-flight request |
| Optimistic UI updates | Score changes, standups, days-off appear instantly |
| Hover prefetch + cache warming | Data ready before user clicks |
| Server-side pagination | Only fetch 200 features at a time for UI |

### Running benchmarks

```bash
# Vitest micro-benchmarks (cache, rate limiter, pagination, points)
npm run bench

# Live API latency benchmark (REST + GraphQL, requires .env.local)
npx tsx benchmarks/live-api-benchmark.ts
```

## Project Structure

```
aha-smt.config.ts         # Org config (gitignored — copy from .example.ts)
aha-smt.config.example.ts # Default config template (committed)
src/
├── app/                   # Pages and API route handlers
│   ├── api/
│   │   ├── aha/           # Aha proxy routes (features, releases, iterations, etc.)
│   │   ├── standups/      # Standup CRUD
│   │   ├── sprint-snapshots/ # Snapshot capture and retrieval
│   │   ├── blockers/      # Blocker tracking
│   │   ├── action-items/  # Action item tracking
│   │   ├── days-off/      # PTO and holidays
│   │   ├── estimation-history/ # Estimation audit trail
│   │   └── settings/      # App settings
│   ├── backlog/           # Backlog grooming page
│   ├── estimate/          # Estimation flow page
│   ├── sprint/            # Sprint list + detail pages
│   ├── standup/           # Standup entry + history pages
│   ├── metrics/           # Velocity and performance page
│   └── settings/          # Settings page
├── components/
│   ├── ui/                # Base UI components (button, card, table, etc.)
│   ├── layout/            # App shell, sidebar, header
│   ├── backlog/           # Backlog table and filters
│   ├── estimate/          # Estimation queue, criteria scorer, point picker
│   ├── sprint/            # Capacity bars, allocation table, days off
│   ├── metrics/           # Velocity chart, KPI cards, comparisons
│   ├── standup/           # Standup form, timeline, blocker tracker
│   └── shared/            # Feature badge, avatar, data table, empty state
├── hooks/                 # React Query hooks for all data fetching
├── lib/
│   ├── config.ts          # Org config types, defaults, defineConfig(), getConfig()
│   ├── aha-client.ts      # Aha REST + GraphQL client with caching and rate limiting
│   ├── aha-cache.ts       # In-memory cache with stale-while-revalidate
│   ├── aha-rate-limiter.ts # Token bucket rate limiter
│   ├── points.ts          # Config-driven point extraction and formatting
│   ├── constants.ts       # Estimation matrix lookup, point scale, nav items
│   ├── capacity.ts        # Sprint capacity calculations
│   ├── standup-parsers.ts # Standup message parsing utilities
│   ├── aha-types.ts       # Aha API type definitions
│   ├── env.ts             # Environment variable validation (Zod)
│   └── db/                # Drizzle schema and SQLite setup
└── providers/             # TanStack Query provider
```

## Testing

```bash
npm test             # Run all 249 tests
npm run test:watch   # Watch mode for development
```

Tests use Vitest with `vite-tsconfig-paths` for `@/` alias resolution. Key patterns:

- Singleton modules (`aha-cache`, `aha-rate-limiter`, `env`, `config`) expose `__reset*()` functions for test isolation, called in a global `beforeEach` via `vitest.setup.ts`
- In-memory SQLite test DB factory at `src/lib/db/__tests__/test-db.ts` for route handler tests
- Rate limiter tests using fake timers call `__resetRateLimiter()` after `vi.useFakeTimers()`
- Cache tests pass explicit TTL to `setInCache()` (env mock doesn't reliably intercept relative imports)

## License

MIT
