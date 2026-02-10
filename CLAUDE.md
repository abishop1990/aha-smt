# CLAUDE.md — Aha SMT

## Project

Scrum master tool built on the Aha! REST API. Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS 4 + TanStack React Query v5 + Drizzle ORM + better-sqlite3. Dark theme only.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build (run to verify no TS/lint errors)
npm test             # Run all unit tests (vitest)
npm run test:watch   # Watch mode
npm run bench        # Run benchmarks (vitest bench)
npx tsx benchmarks/live-api-benchmark.ts  # Live Aha! API latency test
```

## Architecture

### API layer

All Aha! API calls go through `src/lib/aha-client.ts` which handles:
- Bearer token auth (token stays server-side in route handlers)
- In-memory cache with stale-while-revalidate (`src/lib/aha-cache.ts`)
- Token bucket rate limiter: 20 req/s burst, 300 req/min sustained (`src/lib/aha-rate-limiter.ts`)
- Automatic pagination aggregation (`ahaFetchAllPages`)
- Always use `?fields=...` on Aha! API calls — never fetch full objects

Aha! proxy routes live under `src/app/api/aha/`. Local SQLite routes (standups, snapshots, days-off, etc.) live directly under `src/app/api/`.

### Key patterns

- **Next.js 15 route params are Promises**: `{ params }: { params: Promise<{ id: string }> }` — must `await params`
- **`serverExternalPackages: ["better-sqlite3"]`** is required in `next.config.ts`
- **Sprints are modeled as Aha! Releases** (Aha! has no dedicated sprint API)
- **Env vars** validated with Zod in `src/lib/env.ts`. Singleton pattern with `__resetEnv()` for tests
- **DB tables** auto-created via raw SQL in `src/lib/db/index.ts` (no migration files needed)
- **Path alias**: `@/*` maps to `./src/*`

### File layout

```
src/lib/            Core: aha-client, aha-cache, aha-rate-limiter, env, constants, types, db/
src/hooks/          React Query hooks (use-features, use-releases, etc.)
src/components/     ui/ layout/ shared/ backlog/ estimate/ sprint/ metrics/ standup/
src/app/api/        Route handlers (Aha! proxy + local SQLite)
src/app/            Pages (dashboard, backlog, estimate, sprint, standup, metrics, settings)
benchmarks/         Vitest benchmarks + live API benchmark script
```

## Testing

- Vitest with `vite-tsconfig-paths` for `@/` alias resolution
- `vitest.setup.ts` resets singletons (clearCache, __resetRateLimiter, __resetEnv) in global beforeEach
- Singleton modules expose `__reset*()` functions for test isolation
- Cache tests must pass explicit TTL to `setInCache()` (the env mock doesn't reliably intercept relative imports)
- Rate limiter tests using fake timers must call `__resetRateLimiter()` AFTER `vi.useFakeTimers()`
- Benchmark `.bench.ts` files are excluded from `vitest run`; only run via `vitest bench`
- In-memory SQLite test DB factory: `src/lib/db/__tests__/test-db.ts`

## Gotchas

- The Aha! API returns `project_users` (not `users`) from `/products/:id/users`
- `/project_teams` endpoint returns 404 on some Aha! plans — handle gracefully
- Feature list latency is ~1-2s per 200 items from Aha! — always use server-side pagination (`listFeaturesPage`) for large releases
- Never include `description` in feature list queries — fetch it only via `getFeature()` for single items
- `create-next-app` won't run in a directory with existing files — scaffold manually if needed

## Subagent usage policy

Prefer cheaper models for subagents to minimize Claude usage spend. Match the model to the complexity:

- **haiku**: File search/grep, simple code reads, running tests/builds, git operations, generating boilerplate, writing individual components from a clear spec
- **sonnet**: Multi-file refactors, writing tests that need to understand mocking patterns, debugging build errors, code review
- **opus**: Complex architectural decisions, designing new systems, ambiguous requirements needing judgment

When parallelizing work (e.g., writing multiple components or test files), launch multiple haiku/sonnet agents concurrently rather than doing the work sequentially in opus. Batch independent tasks into parallel subagents whenever possible.
