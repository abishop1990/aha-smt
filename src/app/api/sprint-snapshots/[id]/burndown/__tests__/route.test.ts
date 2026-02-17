import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { createTestDb } from "@/lib/db/__tests__/test-db";
import { sprintBurndownEntries } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";

// ---- Module-level test DB reference ----
let testDb: ReturnType<typeof createTestDb>;

// ---- Mocks (hoisted before imports of the route) ----

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => testDb.db),
}));

vi.mock("@/lib/aha-client", () => ({
  listFeaturesInRelease: vi.fn(),
}));

vi.mock("@/lib/config", () => {
  const mockConfig = {
    points: {
      source: ["original_estimate", "score"],
      scale: [1, 2, 3, 5, 8, 13, 21],
      defaultPerDay: 1,
    },
    sprints: {
      mode: "both" as const,
      defaultView: "iterations" as const,
    },
    workflow: {
      completeMeanings: ["DONE", "SHIPPED"],
    },
    estimation: {
      matrix: {},
    },
    backlog: {
      filterType: "release" as const,
    },
  };

  return {
    DEFAULT_CONFIG: mockConfig,
    getConfig: vi.fn(() => mockConfig),
    getConfigSync: vi.fn(() => mockConfig),
    setConfig: vi.fn(),
    __resetConfig: vi.fn(),
  };
});

vi.mock("@/lib/config.server", () => {
  const mockConfig = {
    points: {
      source: ["original_estimate", "score"],
      scale: [1, 2, 3, 5, 8, 13, 21],
      defaultPerDay: 1,
    },
    sprints: {
      mode: "both" as const,
      defaultView: "iterations" as const,
    },
    workflow: {
      completeMeanings: ["DONE", "SHIPPED"],
    },
    estimation: {
      matrix: {},
    },
    backlog: {
      filterType: "release" as const,
    },
  };

  return {
    loadConfigFromDb: vi.fn(async () => mockConfig),
    invalidateServerConfig: vi.fn(),
  };
});

// ---- Import the route AFTER mocks are defined ----
import { GET, POST } from "../route";
import { listFeaturesInRelease } from "@/lib/aha-client";

// ---- Helper to build a parameterized Next.js 15 request ----
function makeRequest(
  method: "GET" | "POST",
  releaseId: string,
  body?: Record<string, unknown>
): [NextRequest, { params: Promise<{ id: string }> }] {
  const req = new NextRequest(
    new URL(`http://localhost:3000/api/sprint-snapshots/${releaseId}/burndown`),
    {
      method,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    }
  );
  const params = Promise.resolve({ id: releaseId });
  return [req, { params }];
}

// ---- Shared fixture features ----
const featureComplete = {
  id: "f1",
  reference_num: "FEAT-1",
  name: "Feature 1",
  position: 1,
  created_at: "2024-01-08T00:00:00.000Z",
  original_estimate: 5,
  workflow_status: { id: "ws-done", name: "Done", complete: true, color: "#0f0", position: 1 },
};

const featureInProgress = {
  id: "f2",
  reference_num: "FEAT-2",
  name: "Feature 2",
  position: 2,
  created_at: "2024-01-08T00:00:00.000Z",
  original_estimate: 8,
  workflow_status: { id: "ws-wip", name: "In Progress", complete: false, color: "#ff0", position: 2 },
};

const featureComplete2 = {
  id: "f3",
  reference_num: "FEAT-3",
  name: "Feature 3",
  position: 3,
  created_at: "2024-01-08T00:00:00.000Z",
  score: 3, // no original_estimate — falls back to score
  workflow_status: { id: "ws-done", name: "Done", complete: true, color: "#0f0", position: 1 },
};

// ---- Setup ----
beforeEach(() => {
  testDb = createTestDb();

  // The shared test-db helper does not create sprint_burndown_entries; create it here.
  testDb.sqlite.exec(`
    CREATE TABLE IF NOT EXISTS sprint_burndown_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id TEXT NOT NULL,
      release_ref_num TEXT NOT NULL,
      captured_date TEXT NOT NULL,
      total_points_planned REAL NOT NULL DEFAULT 0,
      points_remaining REAL NOT NULL DEFAULT 0,
      points_completed REAL NOT NULL DEFAULT 0,
      features_completed INTEGER NOT NULL DEFAULT 0,
      source_type TEXT NOT NULL DEFAULT 'release',
      captured_at TEXT NOT NULL,
      UNIQUE(release_id, captured_date)
    );
  `);

  vi.clearAllMocks();
});

// ============================================================
// GET /api/sprint-snapshots/[id]/burndown
// ============================================================

describe("GET /api/sprint-snapshots/[id]/burndown", () => {
  it("returns empty entries array when no burndown entries exist for the release", async () => {
    const [req, ctx] = makeRequest("GET", "rel-1");

    const res = await GET(req, ctx);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.entries).toEqual([]);
  });

  it("returns only entries for the requested release, ordered by capturedDate ascending", async () => {
    // Insert entries across two releases and multiple dates
    await testDb.db.insert(sprintBurndownEntries).values([
      {
        releaseId: "rel-1",
        releaseRefNum: "REL-1",
        capturedDate: "2024-01-10",
        totalPointsPlanned: 20,
        pointsRemaining: 20,
        pointsCompleted: 0,
        featuresCompleted: 0,
        sourceType: "release",
        capturedAt: "2024-01-10T08:00:00.000Z",
      },
      {
        releaseId: "rel-1",
        releaseRefNum: "REL-1",
        capturedDate: "2024-01-12",
        totalPointsPlanned: 20,
        pointsRemaining: 12,
        pointsCompleted: 8,
        featuresCompleted: 1,
        sourceType: "release",
        capturedAt: "2024-01-12T08:00:00.000Z",
      },
      {
        // Different release — must NOT appear in rel-1 results
        releaseId: "rel-2",
        releaseRefNum: "REL-2",
        capturedDate: "2024-01-11",
        totalPointsPlanned: 10,
        pointsRemaining: 10,
        pointsCompleted: 0,
        featuresCompleted: 0,
        sourceType: "release",
        capturedAt: "2024-01-11T08:00:00.000Z",
      },
    ]);

    const [req, ctx] = makeRequest("GET", "rel-1");
    const res = await GET(req, ctx);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.entries).toHaveLength(2);

    // Ordered ascending by capturedDate
    expect(data.entries[0].capturedDate).toBe("2024-01-10");
    expect(data.entries[1].capturedDate).toBe("2024-01-12");

    // Values match what was inserted
    expect(data.entries[0]).toMatchObject({
      releaseId: "rel-1",
      releaseRefNum: "REL-1",
      totalPointsPlanned: 20,
      pointsRemaining: 20,
      pointsCompleted: 0,
      featuresCompleted: 0,
    });
    expect(data.entries[1]).toMatchObject({
      pointsRemaining: 12,
      pointsCompleted: 8,
      featuresCompleted: 1,
    });
  });

  it("returns entries for a different release independently", async () => {
    await testDb.db.insert(sprintBurndownEntries).values({
      releaseId: "rel-99",
      releaseRefNum: "REL-99",
      capturedDate: "2024-01-15",
      totalPointsPlanned: 13,
      pointsRemaining: 5,
      pointsCompleted: 8,
      featuresCompleted: 2,
      sourceType: "release",
      capturedAt: "2024-01-15T08:00:00.000Z",
    });

    // Querying rel-1 returns nothing
    const [reqA, ctxA] = makeRequest("GET", "rel-1");
    const resA = await GET(reqA, ctxA);
    const dataA = await resA.json();
    expect(dataA.entries).toHaveLength(0);

    // Querying rel-99 returns the entry
    const [reqB, ctxB] = makeRequest("GET", "rel-99");
    const resB = await GET(reqB, ctxB);
    const dataB = await resB.json();
    expect(dataB.entries).toHaveLength(1);
    expect(dataB.entries[0].releaseId).toBe("rel-99");
  });

  it("returns 500 when the database throws", async () => {
    // Close the underlying SQLite connection to force an error
    testDb.sqlite.close();

    const [req, ctx] = makeRequest("GET", "rel-1");
    const res = await GET(req, ctx);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(typeof data.error).toBe("string");
  });
});

// ============================================================
// POST /api/sprint-snapshots/[id]/burndown
// ============================================================

describe("POST /api/sprint-snapshots/[id]/burndown", () => {
  it("returns 201 with correct burndown data when features exist", async () => {
    (listFeaturesInRelease as Mock).mockResolvedValue([
      featureComplete,
      featureInProgress,
      featureComplete2,
    ]);

    const [req, ctx] = makeRequest("POST", "rel-1");
    const res = await POST(req, ctx);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.releaseId).toBe("rel-1");
    expect(data.capturedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(data.sourceType).toBe("release");
  });

  it("computes totalPointsPlanned as the sum of all feature points", async () => {
    // Config source priority: ["original_estimate", "score"]
    // f1: original_estimate=5  → 5
    // f2: original_estimate=8  → 8
    // f3: no original_estimate, score=3 → 3   total = 16
    (listFeaturesInRelease as Mock).mockResolvedValue([
      featureComplete,
      featureInProgress,
      featureComplete2,
    ]);

    const [req, ctx] = makeRequest("POST", "rel-1");
    const res = await POST(req, ctx);
    const data = await res.json();

    expect(data.totalPointsPlanned).toBe(16); // 5 + 8 + 3
  });

  it("computes pointsCompleted as the sum of points for complete features only", async () => {
    // featureComplete (5) + featureComplete2 (3) = 8; featureInProgress excluded
    (listFeaturesInRelease as Mock).mockResolvedValue([
      featureComplete,
      featureInProgress,
      featureComplete2,
    ]);

    const [req, ctx] = makeRequest("POST", "rel-1");
    const res = await POST(req, ctx);
    const data = await res.json();

    expect(data.pointsCompleted).toBe(8);
  });

  it("computes pointsRemaining as totalPointsPlanned minus pointsCompleted", async () => {
    (listFeaturesInRelease as Mock).mockResolvedValue([
      featureComplete,
      featureInProgress,
      featureComplete2,
    ]);

    const [req, ctx] = makeRequest("POST", "rel-1");
    const res = await POST(req, ctx);
    const data = await res.json();

    expect(data.pointsRemaining).toBe(data.totalPointsPlanned - data.pointsCompleted);
    expect(data.pointsRemaining).toBe(8); // 16 - 8
  });

  it("computes featuresCompleted as the count of complete features", async () => {
    (listFeaturesInRelease as Mock).mockResolvedValue([
      featureComplete,
      featureInProgress,
      featureComplete2,
    ]);

    const [req, ctx] = makeRequest("POST", "rel-1");
    const res = await POST(req, ctx);
    const data = await res.json();

    expect(data.featuresCompleted).toBe(2); // f1 and f3
  });

  it("returns 201 with all zeros when release has no features", async () => {
    (listFeaturesInRelease as Mock).mockResolvedValue([]);

    const [req, ctx] = makeRequest("POST", "rel-empty");
    const res = await POST(req, ctx);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.totalPointsPlanned).toBe(0);
    expect(data.pointsCompleted).toBe(0);
    expect(data.pointsRemaining).toBe(0);
    expect(data.featuresCompleted).toBe(0);
  });

  it("treats features without workflow_status as incomplete", async () => {
    const featureNoStatus = {
      id: "f4",
      reference_num: "FEAT-4",
      name: "Feature 4",
      position: 4,
      created_at: "2024-01-08T00:00:00.000Z",
      original_estimate: 5,
      // no workflow_status
    };

    (listFeaturesInRelease as Mock).mockResolvedValue([featureNoStatus]);

    const [req, ctx] = makeRequest("POST", "rel-1");
    const res = await POST(req, ctx);
    const data = await res.json();

    expect(data.totalPointsPlanned).toBe(5);
    expect(data.pointsCompleted).toBe(0);
    expect(data.pointsRemaining).toBe(5);
    expect(data.featuresCompleted).toBe(0);
  });

  it("treats features with workflow_status.complete=false as incomplete", async () => {
    (listFeaturesInRelease as Mock).mockResolvedValue([featureInProgress]);

    const [req, ctx] = makeRequest("POST", "rel-1");
    const res = await POST(req, ctx);
    const data = await res.json();

    expect(data.pointsCompleted).toBe(0);
    expect(data.featuresCompleted).toBe(0);
    expect(data.pointsRemaining).toBe(8);
  });

  it("persists the entry to the database", async () => {
    (listFeaturesInRelease as Mock).mockResolvedValue([featureComplete]);

    const [req, ctx] = makeRequest("POST", "rel-persist");
    await POST(req, ctx);

    const rows = await testDb.db
      .select()
      .from(sprintBurndownEntries)
      .where(eq(sprintBurndownEntries.releaseId, "rel-persist"));

    expect(rows).toHaveLength(1);
    expect(rows[0].totalPointsPlanned).toBe(5);
    expect(rows[0].pointsCompleted).toBe(5);
    expect(rows[0].pointsRemaining).toBe(0);
    expect(rows[0].featuresCompleted).toBe(1);
  });

  it("upserts (overwrites) when called twice for the same release on the same day", async () => {
    // First call: one complete feature (5 pts)
    (listFeaturesInRelease as Mock).mockResolvedValue([featureComplete]);
    const [req1, ctx1] = makeRequest("POST", "rel-1");
    const res1 = await POST(req1, ctx1);
    expect(res1.status).toBe(201);

    // Second call: an additional in-progress feature is added (total 13 pts, 5 completed)
    (listFeaturesInRelease as Mock).mockResolvedValue([featureComplete, featureInProgress]);
    const [req2, ctx2] = makeRequest("POST", "rel-1");
    const res2 = await POST(req2, ctx2);
    expect(res2.status).toBe(201);

    // Only one row should exist for this release+date pair
    const rows = await testDb.db
      .select()
      .from(sprintBurndownEntries)
      .where(eq(sprintBurndownEntries.releaseId, "rel-1"))
      .orderBy(asc(sprintBurndownEntries.capturedDate));

    expect(rows).toHaveLength(1);

    // Row should reflect the second call's values, not the first
    expect(rows[0].totalPointsPlanned).toBe(13); // 5 + 8
    expect(rows[0].pointsCompleted).toBe(5);
    expect(rows[0].pointsRemaining).toBe(8);
    expect(rows[0].featuresCompleted).toBe(1);
  });

  it("stores separate entries for different releases on the same day", async () => {
    (listFeaturesInRelease as Mock).mockResolvedValue([featureComplete]);

    const [reqA, ctxA] = makeRequest("POST", "rel-A");
    await POST(reqA, ctxA);

    (listFeaturesInRelease as Mock).mockResolvedValue([featureInProgress]);

    const [reqB, ctxB] = makeRequest("POST", "rel-B");
    await POST(reqB, ctxB);

    const rowsA = await testDb.db
      .select()
      .from(sprintBurndownEntries)
      .where(eq(sprintBurndownEntries.releaseId, "rel-A"));

    const rowsB = await testDb.db
      .select()
      .from(sprintBurndownEntries)
      .where(eq(sprintBurndownEntries.releaseId, "rel-B"));

    expect(rowsA).toHaveLength(1);
    expect(rowsB).toHaveLength(1);
    expect(rowsA[0].pointsCompleted).toBe(5);
    expect(rowsB[0].pointsCompleted).toBe(0);
  });

  it("uses work_units over score when original_estimate is absent (config priority)", async () => {
    // Config source: ["original_estimate", "score"]
    // This feature has score but no original_estimate → getPoints returns score
    const featureScoreOnly = {
      id: "f-score",
      reference_num: "FEAT-S",
      name: "Score Only Feature",
      position: 1,
      created_at: "2024-01-08T00:00:00.000Z",
      score: 13,
      workflow_status: { id: "ws-done", name: "Done", complete: true, color: "#0f0", position: 1 },
    };

    (listFeaturesInRelease as Mock).mockResolvedValue([featureScoreOnly]);

    const [req, ctx] = makeRequest("POST", "rel-score");
    const res = await POST(req, ctx);
    const data = await res.json();

    expect(data.totalPointsPlanned).toBe(13);
    expect(data.pointsCompleted).toBe(13);
  });

  it("returns 0 points for features that have no point fields set", async () => {
    const featureNoPoints = {
      id: "f-zero",
      reference_num: "FEAT-Z",
      name: "Zero Points Feature",
      position: 1,
      created_at: "2024-01-08T00:00:00.000Z",
      // no original_estimate, no score, no work_units
      workflow_status: { id: "ws-done", name: "Done", complete: true, color: "#0f0", position: 1 },
    };

    (listFeaturesInRelease as Mock).mockResolvedValue([featureNoPoints]);

    const [req, ctx] = makeRequest("POST", "rel-zero");
    const res = await POST(req, ctx);
    const data = await res.json();

    expect(data.totalPointsPlanned).toBe(0);
    expect(data.pointsCompleted).toBe(0);
    expect(data.pointsRemaining).toBe(0);
    expect(data.featuresCompleted).toBe(1); // still counted as complete
  });

  it("calls listFeaturesInRelease with the correct releaseId from route params", async () => {
    (listFeaturesInRelease as Mock).mockResolvedValue([]);

    const [req, ctx] = makeRequest("POST", "rel-specific-id");
    await POST(req, ctx);

    expect(listFeaturesInRelease).toHaveBeenCalledWith("rel-specific-id");
    expect(listFeaturesInRelease).toHaveBeenCalledTimes(1);
  });

  it("returns 500 when listFeaturesInRelease throws", async () => {
    (listFeaturesInRelease as Mock).mockRejectedValue(new Error("Aha! API unavailable"));

    const [req, ctx] = makeRequest("POST", "rel-1");
    const res = await POST(req, ctx);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBe("Aha! API unavailable");
  });

  it("returns 500 when the database throws on insert", async () => {
    (listFeaturesInRelease as Mock).mockResolvedValue([featureComplete]);

    // Drop the table to simulate a DB error during insert
    testDb.sqlite.exec("DROP TABLE sprint_burndown_entries");

    const [req, ctx] = makeRequest("POST", "rel-1");
    const res = await POST(req, ctx);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
    expect(typeof data.error).toBe("string");
  });
});
