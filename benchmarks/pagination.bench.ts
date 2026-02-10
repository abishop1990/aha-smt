import { bench, describe, beforeEach, vi } from "vitest";

// Mock dependencies before importing aha-client
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    AHA_DOMAIN: "bench-domain",
    AHA_API_TOKEN: "bench-token",
    CACHE_TTL_SECONDS: 60,
  }),
}));

vi.mock("@/lib/aha-cache", () => ({
  getCacheKey: (url: string) => url,
  getFromCache: () => null, // Always miss — measure fetch + aggregation
  setInCache: () => {},
  invalidateCache: () => {},
}));

vi.mock("@/lib/aha-rate-limiter", () => ({
  rateLimitedFetch: async () => {},
}));

function createPageResponse(page: number, totalPages: number, itemsPerPage: number) {
  const features = Array.from({ length: itemsPerPage }, (_, i) => ({
    id: `feat-${page}-${i}`,
    reference_num: `FEAT-${page * itemsPerPage + i}`,
    name: `Feature ${page * itemsPerPage + i}`,
    score: Math.floor(Math.random() * 13),
  }));

  return {
    ok: true,
    json: async () => ({
      features,
      pagination: {
        total_records: totalPages * itemsPerPage,
        total_pages: totalPages,
        current_page: page,
        per_page: itemsPerPage,
      },
    }),
  };
}

describe("Pagination Aggregation Performance", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  bench("1 page (200 items)", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      callCount++;
      return createPageResponse(callCount, 1, 200);
    }));

    const { listFeaturesInRelease } = await import("@/lib/aha-client");
    await listFeaturesInRelease("release-1");
  });

  bench("5 pages (1000 items)", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      callCount++;
      return createPageResponse(callCount, 5, 200);
    }));

    const { listFeaturesInRelease } = await import("@/lib/aha-client");
    await listFeaturesInRelease("release-1");
  });

  bench("10 pages (2000 items)", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn(async () => {
      callCount++;
      return createPageResponse(callCount, 10, 200);
    }));

    const { listFeaturesInRelease } = await import("@/lib/aha-client");
    await listFeaturesInRelease("release-1");
  });
});
