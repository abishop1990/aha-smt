# Aha Scrum Master Tool (aha-smt) — Implementation Plan

## Context

Aha.io's UI is slow and bloated for day-to-day scrum master workflows. This tool is a fast, focused Next.js app that uses the Aha REST API to provide the views and flows a scrum master actually needs: backlog grooming, estimation, sprint planning with capacity, standup tracking, and historical sprint metrics. Open source, configurable via `.env`.

**Key constraint:** The Aha REST API has no dedicated iteration/sprint endpoints. We model sprints as Aha Releases (with start/end dates). Aha Develop iterations may be accessible via an undocumented API — we'll explore that against the live instance and add support if available.

---

## Tech Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4** + **shadcn/ui** — dark mode only (1.0), Aha-inspired color palette
- **TanStack React Query v5** — client-side caching (stale-while-revalidate)
- **Drizzle ORM** + **better-sqlite3** — local DB for standups, sprint snapshots, days off
- **recharts** — charts for sprint metrics
- **date-fns** — date math for capacity calculations
- **zod** — env validation

---

## Visual Design: Aha-Inspired Dark Theme

Dark mode only for 1.0. Take visual cues from Aha's layout patterns (sidebar nav, card-based dashboards, table views) but build with lightweight Tailwind + shadcn/ui — no heavy CSS frameworks.

**Color palette (Aha-inspired, dark):**
- Background: `slate-950` / `#0a0f1a` (deep navy-black, similar to Aha's dark sidebar)
- Surface/cards: `slate-900` / `#111827`
- Borders: `slate-800` / `#1e293b`
- Primary accent: `blue-500` / `#3b82f6` (Aha's signature blue)
- Success: `emerald-500` (capacity under)
- Warning: `amber-500` (nearing capacity)
- Danger: `red-500` (over capacity, aged blockers)
- Text primary: `slate-100`, secondary: `slate-400`
- Feature ref badges: colored by workflow status (matching Aha's status colors)

**Layout cues from Aha:**
- Fixed left sidebar (240px) with icon + label nav items
- Top header bar with breadcrumbs and global sprint/release picker
- Card-based dashboard layouts
- Dense, scannable data tables with hover states
- Status pills/badges with workflow colors

**Performance rules:**
- No CSS-in-JS runtime (Tailwind only)
- No heavy animation libraries — CSS transitions only where needed
- Skeleton loading states, not spinners
- Virtualized lists if >100 rows (use `@tanstack/react-virtual` if needed)
- Images/avatars lazy-loaded

---

## Environment Configuration

`.env.example` (committed):
```
AHA_DOMAIN=               # e.g. "effodio" for effodio.aha.io
AHA_API_TOKEN=             # API key from Aha Settings > Personal > Developer
AHA_DEFAULT_PRODUCT_ID=    # Optional: auto-select product on load
DATABASE_URL=file:./data/aha-smt.db
CACHE_TTL_SECONDS=60
```

Validated at startup via zod in `src/lib/env.ts`.

---

## Aha API Client Layer

All Aha calls go through Next.js Route Handlers (keeps token server-side, enables caching).

### `src/lib/aha-client.ts`
- Base URL: `https://{AHA_DOMAIN}.aha.io/api/v1/`
- Auth: `Authorization: Bearer {AHA_API_TOKEN}`
- **Every request MUST use `?fields=...`** to minimize payload (this is critical for speed)
- Auto-pagination: fetches all pages (max `per_page=200`), merges results
- Methods: `getFeature()`, `listFeaturesInRelease()`, `listReleasesInProduct()`, `listTeams()`, `listUsers()`, `listSchedules()`, `updateFeatureScore()`, `getCurrentUser()`

### `src/lib/aha-rate-limiter.ts`
Token bucket: 20 req/sec burst, 300 req/min sustained. Queue requests when at limit.

### `src/lib/aha-cache.ts`
Server-side in-memory Map with TTL (default 60s). Cache key = URL + params hash. Invalidate on writes (e.g., updating a feature score clears that feature + its release cache).

### `src/lib/aha-types.ts`
TypeScript interfaces for: `AhaFeature`, `AhaRelease`, `AhaTeam`, `AhaSchedule`, `AhaUser`, `AhaPagination`, `AhaWorkflowStatus`.

---

## Database Schema (SQLite via Drizzle)

### `src/lib/db/schema.ts`

**`app_settings`** — persisted config (selected product, team, etc.)
- `key` (PK), `value`, `updated_at`

**`standup_entries`** — daily standup submissions
- `id`, `user_id`, `user_name`, `standup_date`, `done_since_last_standup`, `working_on_now`, `blockers`, `action_items`, `feature_refs` (JSON), `created_at`, `updated_at`

**`blockers`** — tracked across standups for aging/resolution
- `id`, `standup_entry_id` (FK), `user_id`, `description`, `feature_ref`, `status` (open/resolved), `resolved_at`, `created_at`

**`action_items`** — tracked for completion
- `id`, `standup_entry_id` (FK), `user_id`, `assignee_user_id`, `description`, `completed`, `completed_at`, `created_at`

**`sprint_snapshots`** — captured at sprint end for historical metrics
- `id`, `release_id`, `release_ref_num`, `release_name`, `start_date`, `end_date`, `total_points_planned`, `total_points_completed`, `total_features_planned`, `total_features_completed`, `carryover_points`, `member_metrics` (JSON), `feature_snapshot` (JSON), `captured_at`

**`estimation_history`** — criteria breakdown for each estimation (for calibration)
- `id`, `feature_id`, `feature_ref_num`, `feature_name`, `scope` (L/M/H), `complexity` (L/M/H), `unknowns` (L/M/H), `suggested_points`, `final_points` (what the user actually chose), `estimated_by_user_id`, `created_at`

**`days_off`** — PTO and holidays affecting capacity
- `id`, `user_id` (null = company-wide holiday), `user_name`, `date`, `reason`, `is_holiday`, `created_at`

---

## Feature Modules

### 1. Unestimated Backlog View (`/backlog`)

**What it does:** Shows all features in a selected release/backlog that have no story points (`score` is null or 0). Sorted by priority position.

**API route:** `GET /api/aha/releases/[id]/features?unestimated=true`
- Calls `GET /api/v1/releases/{id}/features?fields=id,reference_num,name,score,workflow_status,assigned_to_user,tags,position,created_at&per_page=200`
- Filters where `score` is null/0 server-side
- Cached 60s

**Components:**
- `backlog-filters.tsx` — release picker, assignee filter, tag filter
- `backlog-table.tsx` — sortable table: Ref#, Name, Status, Assignee, Tags, Created
- `feature-row.tsx` — row with hover description preview, "Estimate" button

### 2. Estimation Tool (`/estimate`)

**What it does:** Queue-based flow for estimating unpointed features one at a time. Uses a **three-criteria estimation model** (Scope, Complexity, Unknowns) to arrive at a final point value. Shows feature context and similar past features for calibration.

**Three-Criteria Estimation Model:**
Each feature is scored across three dimensions before arriving at a final point value:
- **Scope** — How much work is involved? (surface area of changes, number of components/files/endpoints touched)
- **Complexity** — How hard is the work? (algorithmic difficulty, integration complexity, cross-team dependencies)
- **Unknowns** — How much uncertainty exists? (new technology, unclear requirements, external dependencies, risk)

Each criterion is rated Low / Medium / High (or 1-3), and the combination drives a suggested Fibonacci point value:
| Scope | Complexity | Unknowns | Suggested Points |
|-------|-----------|----------|-----------------|
| L     | L         | L        | 1               |
| L     | L         | M        | 2               |
| L     | M         | L        | 2               |
| M     | L         | L        | 3               |
| L     | M         | M        | 3               |
| M     | M         | L        | 5               |
| M     | L         | M        | 5               |
| L     | H         | M        | 5               |
| M     | M         | M        | 8               |
| H     | M         | L        | 8               |
| H     | M         | M        | 13              |
| H     | H         | L        | 13              |
| M     | H         | H        | 13              |
| H     | H         | M        | 21              |
| H     | H         | H        | 21              |

The tool **suggests** a point value based on the criteria but the user can override with any Fibonacci value.

**API routes:**
- `GET /api/aha/releases/[id]/features?unestimated=true` (load queue)
- `PUT /api/aha/features/[id]` (write score back to Aha)

**Components:**
- `estimation-queue.tsx` — sidebar list of features to estimate, progress indicator
- `estimation-card.tsx` — current feature: name, description, requirements, tags
- `criteria-scorer.tsx` — three-row scorer for Scope/Complexity/Unknowns, each with L/M/H toggle buttons. Shows suggested point value based on combination.
- `estimation-context-panel.tsx` — similar completed features with their scores and criteria history (for calibration)
- `point-picker.tsx` — Fibonacci buttons (1, 2, 3, 5, 8, 13, 21) with the suggested value highlighted. Skip button, keyboard shortcuts.

**Calibration:** Fetch completed features from recent releases with matching tags. Cache aggressively (historical data doesn't change). Show their criteria breakdown if previously estimated through this tool (stored in local DB).

### 3. Sprint Planning (`/sprint`, `/sprint/[releaseId]`)

**What it does:** Per-member capacity vs allocation view. Shows who's over/under-committed accounting for days off.

**Data aggregation (server-side):**
1. Fetch release details (dates)
2. Fetch features in release (scores + assignees)
3. Fetch team + schedule data (story_points_per_day)
4. Query local `days_off` table for each member in sprint range
5. Compute: `adjusted_capacity = (business_days - days_off) * points_per_day`
6. Compute: `delta = adjusted_capacity - sum(assigned_feature_scores)`

**Components:**
- `sprint-overview.tsx` — summary cards: sprint dates, total points, assigned vs unassigned, days remaining
- `member-allocation-table.tsx` — one row per member showing capacity, allocated, delta
- `capacity-bar.tsx` — horizontal bar: green=capacity, fill=allocated, red=over
- `days-off-indicator.tsx` — editable PTO/holiday management per member
- `sprint-feature-list.tsx` — all features grouped by assignee

### 4. Post-Sprint Metrics (`/metrics`)

**What it does:** Historical sprint performance dashboard. Based on locally-captured sprint snapshots.

**Snapshot capture:** Manual "Capture Sprint" button fetches current release state, computes planned vs completed, stores in `sprint_snapshots` table.

**Components:**
- `velocity-chart.tsx` — line chart: velocity over sprints (recharts)
- `member-performance-table.tsx` — planned vs actual per member across sprints
- `sprint-comparison-card.tsx` — side-by-side sprint comparison
- `metric-summary-cards.tsx` — KPIs: avg velocity, accuracy ratio, carryover rate, completion rate

### 5. Standup Tool (`/standup`, `/standup/[date]`)

**What it does:** Team members pre-enter daily standup updates. Tracks blockers and action items across standups with aging.

**Components:**
- `standup-form.tsx` — four fields: done, working on, blockers, action items. Feature autocomplete from Aha assigned features.
- `standup-member-list.tsx` — team roster with submitted/missing indicators
- `standup-timeline.tsx` — date picker + entries for selected date
- `blocker-tracker.tsx` — open blockers across all standups, aging indicators (amber >2d, red >5d)
- `action-item-list.tsx` — action items with checkbox completion, assignee filter

---

## File Structure

```
src/
├── app/
│   ├── layout.tsx, page.tsx, globals.css, loading.tsx, error.tsx
│   ├── backlog/page.tsx
│   ├── estimate/page.tsx
│   ├── sprint/page.tsx, [releaseId]/page.tsx
│   ├── metrics/page.tsx
│   ├── standup/page.tsx, [date]/page.tsx
│   ├── settings/page.tsx
│   └── api/
│       ├── aha/{features,releases,teams,users,schedules,me}/route.ts
│       ├── standups/route.ts, [id]/route.ts
│       ├── sprint-snapshots/route.ts, [id]/route.ts
│       └── settings/route.ts
├── lib/
│   ├── aha-client.ts, aha-cache.ts, aha-rate-limiter.ts, aha-types.ts
│   ├── db/{index.ts, schema.ts}
│   ├── env.ts, utils.ts, constants.ts
├── hooks/
│   ├── use-features.ts, use-releases.ts, use-teams.ts
│   ├── use-schedules.ts, use-standups.ts, use-sprint-snapshots.ts
├── components/
│   ├── ui/ (shadcn/ui)
│   ├── layout/{app-shell, sidebar-nav, header, release-selector}.tsx
│   ├── backlog/{backlog-table, backlog-filters, feature-row}.tsx
│   ├── estimate/{estimation-queue, estimation-card, criteria-scorer, point-picker, estimation-context-panel}.tsx
│   ├── sprint/{sprint-overview, member-allocation-table, capacity-bar, days-off-indicator, sprint-feature-list}.tsx
│   ├── metrics/{velocity-chart, member-performance-table, sprint-comparison-card, metric-summary-cards}.tsx
│   ├── standup/{standup-form, standup-entry-card, standup-timeline, blocker-tracker, action-item-list}.tsx
│   └── shared/{feature-badge, user-avatar, empty-state, data-table}.tsx
└── providers/query-provider.tsx
```

---

## Implementation Phases

### Phase 1: Scaffolding
- `create-next-app`, shadcn/ui init, install deps
- `.env.example`, env validation, DB schema + migrations
- Layout shell (dark theme sidebar, header, nav)
- TanStack Query provider
- `.gitignore` (`.env.local`, `data/*.db`, `node_modules`)

### Phase 2: Aha API Client
- `aha-client.ts`, rate limiter, cache, types
- All `/api/aha/*` route handlers
- Release selector component, Settings page
- Verify connectivity with `/api/aha/me`

### Phase 3: Backlog View
- Backlog table, filters, feature rows
- Unestimated filtering, sorting by priority
- Link to estimation flow

### Phase 4: Estimation Tool
- Queue-based estimation UI with three-criteria scorer (Scope, Complexity, Unknowns)
- Criteria-to-points mapping with suggested value + manual override
- Score write-back to Aha
- Estimation history stored locally for calibration
- Similar feature lookup with criteria history
- Keyboard shortcuts

### Phase 5: Sprint Planning
- Capacity calculation logic
- Member allocation table with capacity bars
- Days off management (local DB)
- Sprint overview cards

### Phase 6: Standup Tool
- Standup CRUD (local DB)
- Feature autocomplete from Aha
- Blocker tracking with aging
- Action item tracking
- Timeline/history view

### Phase 7: Sprint Metrics
- Sprint snapshot capture
- Velocity chart, performance tables
- Sprint comparison, KPI cards

### Phase 8: Polish
- Loading skeletons, error boundaries, empty states
- Performance audit (caching, bundle size)
- README with setup instructions

---

## Verification Plan

1. **API connectivity:** Hit `/api/aha/me` — should return current user
2. **Backlog view:** Select a release with unpointed features — verify they render, pointed ones are hidden
3. **Estimation:** Rate a feature on Scope/Complexity/Unknowns — verify suggested points match matrix, override works, score writes to Aha, criteria saved to local DB
4. **Sprint planning:** Select a sprint release — verify member capacity math matches manual calculation
5. **Standup:** Submit an entry — verify it persists, appears in timeline, blockers track correctly
6. **Metrics:** Capture a sprint snapshot — verify velocity chart renders with data
7. **Performance:** Navigation between pages should feel instant after initial load (verify via Network tab — subsequent requests should hit cache)
