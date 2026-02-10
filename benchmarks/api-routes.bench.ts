import { bench, describe, beforeEach, vi } from "vitest";
import type { AhaRelease, AhaFeature } from "@/lib/aha-types";

// Mock the aha-client module
const mockReleases: AhaRelease[] = Array.from({ length: 20 }, (_, i) => ({
  id: `rel-${i}`,
  reference_num: `REL-${i}`,
  name: `Sprint ${i + 1}`,
  start_date: `2026-0${(i % 9) + 1}-01`,
  release_date: `2026-0${(i % 9) + 1}-14`,
  progress: Math.floor(Math.random() * 100),
  parking_lot: i > 15, // Last few are parking lot
}));

const mockFeatures: AhaFeature[] = Array.from({ length: 50 }, (_, i) => ({
  id: `feat-${i}`,
  reference_num: `FEAT-${i}`,
  name: `Feature ${i}`,
  score: i % 3 === 0 ? null : [1, 2, 3, 5, 8, 13][i % 6],
  workflow_status: { id: "ws-1", name: "In Progress", color: "#3b82f6", position: 1, complete: i % 4 === 0 },
  assigned_to_user: { id: `user-${i % 5}`, name: `User ${i % 5}`, email: `user${i % 5}@test.com` },
  tags: [`tag-${i % 3}`],
  position: i,
  created_at: "2026-01-15T00:00:00Z",
}));

vi.mock("@/lib/aha-client", () => ({
  listReleasesInProduct: vi.fn(async () => mockReleases),
  listProducts: vi.fn(async () => [{ id: "prod-1", reference_prefix: "PROD", name: "Product 1" }]),
  listFeaturesInRelease: vi.fn(async (_id: string, options?: { unestimatedOnly?: boolean }) => {
    if (options?.unestimatedOnly) {
      return mockFeatures.filter((f) => f.score === null || f.score === undefined || f.score === 0);
    }
    return mockFeatures;
  }),
}));

vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    AHA_DOMAIN: "bench-domain",
    AHA_API_TOKEN: "bench-token",
    AHA_DEFAULT_PRODUCT_ID: "prod-1",
    CACHE_TTL_SECONDS: 60,
  }),
}));

describe("API Route Handler Performance", () => {
  bench("GET /api/aha/releases", async () => {
    const { GET } = await import("@/app/api/aha/releases/route");
    const request = new Request("http://localhost:3000/api/aha/releases?productId=prod-1");
    const response = await GET(request as any);
    await response.json();
  });

  bench("GET /api/aha/releases/[id]/features", async () => {
    const { GET } = await import("@/app/api/aha/releases/[id]/features/route");
    const request = new Request("http://localhost:3000/api/aha/releases/rel-1/features");
    const response = await GET(request as any, { params: Promise.resolve({ id: "rel-1" }) });
    await response.json();
  });

  bench("GET /api/aha/releases/[id]/features?unestimated=true", async () => {
    const { GET } = await import("@/app/api/aha/releases/[id]/features/route");
    const request = new Request("http://localhost:3000/api/aha/releases/rel-1/features?unestimated=true");
    const response = await GET(request as any, { params: Promise.resolve({ id: "rel-1" }) });
    await response.json();
  });
});
