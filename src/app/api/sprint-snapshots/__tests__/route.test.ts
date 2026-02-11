import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import { createTestDb } from "@/lib/db/__tests__/test-db";
import { sprintSnapshots } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => testDb.db),
}));

// Mock aha-client since POST handler imports it
vi.mock("@/lib/aha-client", () => ({
  listFeaturesInRelease: vi.fn(),
  getRelease: vi.fn(),
  listFeaturesInIteration: vi.fn(),
  getIteration: vi.fn(),
}));

vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(() => ({ AHA_TEAM_PRODUCT_ID: "team-1" })),
}));

import { GET, POST } from "../route";
import { listFeaturesInRelease, getRelease, listFeaturesInIteration, getIteration } from "@/lib/aha-client";
import { getEnv } from "@/lib/env";

describe("GET /api/sprint-snapshots", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("returns empty snapshots array initially", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/sprint-snapshots"));
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.snapshots).toEqual([]);
  });

  it("returns snapshots after insert", async () => {
    await testDb.db.insert(sprintSnapshots).values({
      releaseId: "rel-1",
      releaseRefNum: "REL-1",
      releaseName: "Sprint 1",
      startDate: "2024-01-08",
      endDate: "2024-01-19",
      totalPointsPlanned: 21,
      totalPointsCompleted: 13,
      totalFeaturesPlanned: 5,
      totalFeaturesCompleted: 3,
      carryoverPoints: 8,
      memberMetrics: JSON.stringify({ u1: { name: "Alice", planned: 13, completed: 8, features: 3 } }),
      featureSnapshot: JSON.stringify([]),
      sourceType: "release",
      pointSource: "score",
      capturedAt: "2024-01-19T17:00:00.000Z",
    });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.snapshots).toHaveLength(1);
    expect(data.snapshots[0]).toMatchObject({
      releaseId: "rel-1",
      releaseRefNum: "REL-1",
      releaseName: "Sprint 1",
      totalPointsPlanned: 21,
      totalPointsCompleted: 13,
      sourceType: "release",
      pointSource: "score",
    });
  });

  it("returns snapshots ordered by capturedAt descending", async () => {
    await testDb.db.insert(sprintSnapshots).values([
      {
        releaseId: "rel-1",
        releaseRefNum: "REL-1",
        releaseName: "Sprint 1",
        totalPointsPlanned: 21,
        totalPointsCompleted: 13,
        totalFeaturesPlanned: 5,
        totalFeaturesCompleted: 3,
        carryoverPoints: 8,
        memberMetrics: "{}",
        featureSnapshot: "[]",
        capturedAt: "2024-01-19T17:00:00.000Z",
      },
      {
        releaseId: "rel-2",
        releaseRefNum: "REL-2",
        releaseName: "Sprint 2",
        totalPointsPlanned: 34,
        totalPointsCompleted: 34,
        totalFeaturesPlanned: 8,
        totalFeaturesCompleted: 8,
        carryoverPoints: 0,
        memberMetrics: "{}",
        featureSnapshot: "[]",
        capturedAt: "2024-02-02T17:00:00.000Z",
      },
    ]);

    const res = await GET();
    const data = await res.json();

    expect(data.snapshots).toHaveLength(2);
    expect(data.snapshots[0].releaseName).toBe("Sprint 2");
    expect(data.snapshots[1].releaseName).toBe("Sprint 1");
  });

  it("returns memberMetrics as stored JSON string", async () => {
    const memberMetrics = JSON.stringify({
      u1: { name: "Alice", planned: 13, completed: 8, features: 3 },
    });

    await testDb.db.insert(sprintSnapshots).values({
      releaseId: "rel-1",
      releaseRefNum: "REL-1",
      releaseName: "Sprint 1",
      totalPointsPlanned: 13,
      totalPointsCompleted: 8,
      totalFeaturesPlanned: 3,
      totalFeaturesCompleted: 2,
      carryoverPoints: 5,
      memberMetrics,
      featureSnapshot: "[]",
      capturedAt: "2024-01-19T17:00:00.000Z",
    });

    const res = await GET();
    const data = await res.json();

    expect(data.snapshots[0].memberMetrics).toBe(memberMetrics);
  });

  it("handles database errors", async () => {
    testDb.sqlite.close();

    const res = await GET();

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });
});

describe("POST /api/sprint-snapshots", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
    // Reset env mock to default
    (getEnv as Mock).mockReturnValue({ AHA_TEAM_PRODUCT_ID: "team-1" });
  });

  it("returns 400 when neither releaseId nor iterationRef provided", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/sprint-snapshots"), {
      method: "POST",
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("releaseId or iterationRef is required");
  });

  it("creates release-based snapshot", async () => {
    const mockFeatures = [
      {
        id: "f1",
        reference_num: "FEAT-1",
        name: "Feature 1",
        score: 5,
        workflow_status: { id: "ws1", name: "Done", complete: true },
        assigned_to_user: { id: "u1", name: "Alice" },
      },
      {
        id: "f2",
        reference_num: "FEAT-2",
        name: "Feature 2",
        score: 8,
        workflow_status: { id: "ws2", name: "In Progress", complete: false },
        assigned_to_user: { id: "u1", name: "Alice" },
      },
      {
        id: "f3",
        reference_num: "FEAT-3",
        name: "Feature 3",
        score: 3,
        workflow_status: { id: "ws3", name: "Done", complete: true },
        assigned_to_user: { id: "u2", name: "Bob" },
      },
    ];

    (getRelease as Mock).mockResolvedValue({
      id: "rel-1",
      reference_num: "REL-1",
      name: "Sprint 1",
      start_date: "2024-01-08",
      release_date: "2024-01-19",
    });
    (listFeaturesInRelease as Mock).mockResolvedValue(mockFeatures);

    const req = new NextRequest(new URL("http://localhost:3000/api/sprint-snapshots"), {
      method: "POST",
      body: JSON.stringify({ releaseId: "rel-1" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.releaseId).toBe("rel-1");
    expect(data.releaseRefNum).toBe("REL-1");
    expect(data.releaseName).toBe("Sprint 1");
    expect(data.sourceType).toBe("release");
    expect(data.pointSource).toBe("original_estimate");
    expect(data.totalPointsPlanned).toBe(16); // 5 + 8 + 3
    expect(data.totalPointsCompleted).toBe(8); // 5 + 3 (Done features)
    expect(data.carryoverPoints).toBe(8); // 16 - 8
    expect(data.totalFeaturesPlanned).toBe(3);
    expect(data.totalFeaturesCompleted).toBe(2);

    // Verify memberMetrics is a JSON string with correct data
    const memberMetrics = JSON.parse(data.memberMetrics);
    expect(memberMetrics.u1).toEqual({
      name: "Alice",
      planned: 13, // 5 + 8
      completed: 5, // Only FEAT-1
      features: 2,
    });
    expect(memberMetrics.u2).toEqual({
      name: "Bob",
      planned: 3,
      completed: 3,
      features: 1,
    });
  });

  it("creates iteration-based snapshot", async () => {
    const mockFeatures = [
      {
        id: "f1",
        reference_num: "FEAT-1",
        name: "Feature 1",
        original_estimate: 5,
        work_units: 5,
        workflow_status: { id: "ws1", name: "Done", complete: true },
        assigned_to_user: { id: "u1", name: "Alice" },
      },
      {
        id: "f2",
        reference_num: "FEAT-2",
        name: "Feature 2",
        original_estimate: 8,
        work_units: 8,
        workflow_status: { id: "ws2", name: "In Progress", complete: false },
        assigned_to_user: { id: "u1", name: "Alice" },
      },
    ];

    (getIteration as Mock).mockResolvedValue({
      id: "iter-1",
      reference_num: "ITER-1",
      name: "Iteration 1",
      start_date: "2024-01-08",
      end_date: "2024-01-19",
    });
    (listFeaturesInIteration as Mock).mockResolvedValue(mockFeatures);

    const req = new NextRequest(new URL("http://localhost:3000/api/sprint-snapshots"), {
      method: "POST",
      body: JSON.stringify({ iterationRef: "ITER-1" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.releaseId).toBe("iter-1");
    expect(data.releaseRefNum).toBe("ITER-1");
    expect(data.releaseName).toBe("Iteration 1");
    expect(data.sourceType).toBe("iteration");
    expect(data.pointSource).toBe("original_estimate");
    expect(data.totalPointsPlanned).toBe(13); // 5 + 8
    expect(data.totalPointsCompleted).toBe(5); // Only f1 is done

    // Verify aha-client was called with correct params
    expect(getIteration).toHaveBeenCalledWith("team-1", "ITER-1");
    expect(listFeaturesInIteration).toHaveBeenCalledWith("team-1", "ITER-1");
  });

  it("returns 404 when iteration not found", async () => {
    (getIteration as Mock).mockResolvedValue(undefined);
    (listFeaturesInIteration as Mock).mockResolvedValue([]);

    const req = new NextRequest(new URL("http://localhost:3000/api/sprint-snapshots"), {
      method: "POST",
      body: JSON.stringify({ iterationRef: "ITER-999" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe("Iteration not found");
  });

  it("returns 400 when teamProductId missing for iteration", async () => {
    // Override env mock to return empty config
    (getEnv as Mock).mockReturnValue({});

    const req = new NextRequest(new URL("http://localhost:3000/api/sprint-snapshots"), {
      method: "POST",
      body: JSON.stringify({ iterationRef: "ITER-1" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("teamProductId is required for iteration snapshots");
  });

  it("replaces existing snapshot for same sprint", async () => {
    // Insert initial snapshot
    await testDb.db.insert(sprintSnapshots).values({
      releaseId: "rel-1",
      releaseRefNum: "REL-1",
      releaseName: "Sprint 1",
      startDate: "2024-01-08",
      endDate: "2024-01-19",
      totalPointsPlanned: 10,
      totalPointsCompleted: 5,
      totalFeaturesPlanned: 2,
      totalFeaturesCompleted: 1,
      carryoverPoints: 5,
      memberMetrics: "{}",
      featureSnapshot: "[]",
      sourceType: "release",
      pointSource: "score",
      capturedAt: "2024-01-19T17:00:00.000Z",
    });

    const mockFeatures = [
      {
        id: "f1",
        reference_num: "FEAT-1",
        name: "Feature 1",
        score: 8,
        workflow_status: { id: "ws1", name: "Done", complete: true },
        assigned_to_user: { id: "u1", name: "Alice" },
      },
    ];

    (getRelease as Mock).mockResolvedValue({
      id: "rel-1",
      reference_num: "REL-1",
      name: "Sprint 1",
      start_date: "2024-01-08",
      release_date: "2024-01-19",
    });
    (listFeaturesInRelease as Mock).mockResolvedValue(mockFeatures);

    const req = new NextRequest(new URL("http://localhost:3000/api/sprint-snapshots"), {
      method: "POST",
      body: JSON.stringify({ releaseId: "rel-1" }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);

    // Verify only one snapshot exists for REL-1
    const allSnapshots = await testDb.db
      .select()
      .from(sprintSnapshots)
      .where(eq(sprintSnapshots.releaseRefNum, "REL-1"));

    expect(allSnapshots).toHaveLength(1);
    // Verify it has the new values, not the old ones
    expect(allSnapshots[0].totalPointsPlanned).toBe(8); // Not 10
    expect(allSnapshots[0].totalPointsCompleted).toBe(8); // Not 5
  });
});
