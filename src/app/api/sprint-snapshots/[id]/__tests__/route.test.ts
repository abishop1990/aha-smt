import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createTestDb } from "@/lib/db/__tests__/test-db";
import { sprintSnapshots } from "@/lib/db/schema";

let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => testDb.db),
}));

import { GET, DELETE } from "../route";

describe("GET /api/sprint-snapshots/[id]", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("returns snapshot by ID", async () => {
    // Create a snapshot
    const inserted = await testDb.db
      .insert(sprintSnapshots)
      .values({
        releaseId: "REL-123",
        releaseRefNum: "REL-123",
        releaseName: "Sprint 1",
        startDate: "2024-01-01",
        endDate: "2024-01-14",
        totalPointsPlanned: 50,
        totalPointsCompleted: 45,
        totalFeaturesPlanned: 10,
        totalFeaturesCompleted: 9,
        carryoverPoints: 5,
        memberMetrics: JSON.stringify([]),
        featureSnapshot: JSON.stringify([]),
        sourceType: "release",
        pointSource: "score",
        capturedAt: new Date().toISOString(),
      })
      .returning();

    const snapshotId = inserted[0].id;

    const res = await GET(
      new NextRequest(new URL(`http://localhost:3000/api/sprint-snapshots/${snapshotId}`)),
      { params: Promise.resolve({ id: String(snapshotId) }) }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.id).toBe(snapshotId);
    expect(data.releaseId).toBe("REL-123");
    expect(data.releaseName).toBe("Sprint 1");
    expect(data.totalPointsPlanned).toBe(50);
    expect(data.totalPointsCompleted).toBe(45);
  });

  it("returns 404 for non-existent ID", async () => {
    const res = await GET(
      new NextRequest(new URL("http://localhost:3000/api/sprint-snapshots/999")),
      { params: Promise.resolve({ id: "999" }) }
    );

    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Not found");
  });

  it("handles database errors", async () => {
    testDb.sqlite.close();

    const res = await GET(
      new NextRequest(new URL("http://localhost:3000/api/sprint-snapshots/1")),
      { params: Promise.resolve({ id: "1" }) }
    );

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});

describe("DELETE /api/sprint-snapshots/[id]", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("removes snapshot", async () => {
    // Create a snapshot
    const inserted = await testDb.db
      .insert(sprintSnapshots)
      .values({
        releaseId: "REL-456",
        releaseRefNum: "REL-456",
        releaseName: "Sprint 2",
        startDate: "2024-01-15",
        endDate: "2024-01-28",
        totalPointsPlanned: 60,
        totalPointsCompleted: 55,
        totalFeaturesPlanned: 12,
        totalFeaturesCompleted: 11,
        carryoverPoints: 5,
        memberMetrics: JSON.stringify([]),
        featureSnapshot: JSON.stringify([]),
        sourceType: "release",
        pointSource: "score",
        capturedAt: new Date().toISOString(),
      })
      .returning();

    const snapshotId = inserted[0].id;

    // Delete it
    const deleteRes = await DELETE(
      new NextRequest(new URL(`http://localhost:3000/api/sprint-snapshots/${snapshotId}`), {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: String(snapshotId) }) }
    );
    const deleteData = await deleteRes.json();

    expect(deleteRes.status).toBe(200);
    expect(deleteData.success).toBe(true);

    // Verify it's gone
    const getRes = await GET(
      new NextRequest(new URL(`http://localhost:3000/api/sprint-snapshots/${snapshotId}`)),
      { params: Promise.resolve({ id: String(snapshotId) }) }
    );

    expect(getRes.status).toBe(404);
  });
});
