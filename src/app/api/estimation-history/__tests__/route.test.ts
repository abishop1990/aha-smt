import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createTestDb } from "@/lib/db/__tests__/test-db";

let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => testDb.db),
}));

import { GET, POST } from "../route";

describe("GET /api/estimation-history", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("returns empty array initially", async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.history).toEqual([]);
  });

  it("returns entries ordered by createdAt desc", async () => {
    // Create entries
    await POST(
      new NextRequest(new URL("http://localhost:3000/api/estimation-history"), {
        method: "POST",
        body: JSON.stringify({
          featureId: "FEAT-1",
          featureRefNum: "FEAT-1",
          featureName: "Feature 1",
          scope: "M",
          complexity: "M",
          unknowns: "L",
          suggestedPoints: 5,
          finalPoints: 5,
          estimatedByUserId: "user-1",
        }),
      })
    );

    // Wait a tiny bit to ensure different timestamp
    await new Promise((resolve) => setTimeout(resolve, 10));

    await POST(
      new NextRequest(new URL("http://localhost:3000/api/estimation-history"), {
        method: "POST",
        body: JSON.stringify({
          featureId: "FEAT-2",
          featureRefNum: "FEAT-2",
          featureName: "Feature 2",
          scope: "H",
          complexity: "H",
          unknowns: "M",
          suggestedPoints: 8,
          finalPoints: 8,
          estimatedByUserId: "user-2",
        }),
      })
    );

    const res = await GET();
    const data = await res.json();

    expect(data.history).toHaveLength(2);
    // Most recent first
    expect(data.history[0].featureId).toBe("FEAT-2");
    expect(data.history[1].featureId).toBe("FEAT-1");
  });

  it("limits to 100 entries", async () => {
    // Create 105 entries
    for (let i = 0; i < 105; i++) {
      await POST(
        new NextRequest(new URL("http://localhost:3000/api/estimation-history"), {
          method: "POST",
          body: JSON.stringify({
            featureId: `FEAT-${i}`,
            featureRefNum: `FEAT-${i}`,
            featureName: `Feature ${i}`,
            scope: "L",
            complexity: "L",
            unknowns: "L",
            suggestedPoints: 3,
            finalPoints: 3,
          }),
        })
      );
    }

    const res = await GET();
    const data = await res.json();

    expect(data.history).toHaveLength(100);
  });

  it("handles database errors", async () => {
    testDb.sqlite.close();

    const res = await GET();

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});

describe("POST /api/estimation-history", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("creates entry and returns 201", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/estimation-history"), {
      method: "POST",
      body: JSON.stringify({
        featureId: "FEAT-123",
        featureRefNum: "FEAT-123",
        featureName: "Test Feature",
        scope: "M",
        complexity: "H",
        unknowns: "L",
        suggestedPoints: 5,
        finalPoints: 8,
        estimatedByUserId: "user-1",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.featureId).toBe("FEAT-123");
    expect(data.featureRefNum).toBe("FEAT-123");
    expect(data.featureName).toBe("Test Feature");
    expect(data.scope).toBe("M");
    expect(data.complexity).toBe("H");
    expect(data.unknowns).toBe("L");
    expect(data.suggestedPoints).toBe(5);
    expect(data.finalPoints).toBe(8);
    expect(data.estimatedByUserId).toBe("user-1");
    expect(data.id).toBeTruthy();
    expect(data.createdAt).toBeTruthy();
  });

  it("creates entry without estimatedByUserId", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/estimation-history"), {
      method: "POST",
      body: JSON.stringify({
        featureId: "FEAT-456",
        featureRefNum: "FEAT-456",
        featureName: "Another Feature",
        scope: "L",
        complexity: "L",
        unknowns: "L",
        suggestedPoints: 3,
        finalPoints: 3,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.estimatedByUserId).toBeNull();
  });
});
