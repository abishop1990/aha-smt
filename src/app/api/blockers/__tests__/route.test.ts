import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createTestDb } from "@/lib/db/__tests__/test-db";

let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => testDb.db),
}));

import { GET } from "../route";
import { PUT } from "../[id]/route";
import { POST as standupPOST } from "../../standups/route";

async function createStandupWithBlockers(blockerItems: Array<{ description: string; featureRef?: string | null }>) {
  const req = new NextRequest(new URL("http://localhost:3000/api/standups"), {
    method: "POST",
    body: JSON.stringify({
      userId: "user-1",
      userName: "Alice",
      standupDate: "2024-01-15",
      doneSinceLastStandup: "Worked on stuff",
      workingOnNow: "More stuff",
      blockers: "",
      actionItems: "",
      blockerItems,
    }),
  });
  const res = await standupPOST(req);
  return res.json();
}

describe("GET /api/blockers", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("returns empty blockers array initially", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/blockers"));
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.blockers).toEqual([]);
  });

  it("returns blockers after creation via standup", async () => {
    await createStandupWithBlockers([
      { description: "Waiting for API docs", featureRef: "FEAT-10" },
      { description: "Blocked by deploy" },
    ]);

    const req = new NextRequest(new URL("http://localhost:3000/api/blockers"));
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.blockers).toHaveLength(2);
  });

  it("filters by status=open", async () => {
    await createStandupWithBlockers([
      { description: "Blocker 1" },
      { description: "Blocker 2" },
    ]);

    // Resolve the first one
    const allReq = new NextRequest(new URL("http://localhost:3000/api/blockers"));
    const allRes = await GET(allReq);
    const allData = await allRes.json();
    const firstId = allData.blockers[0].id;

    await PUT(
      new NextRequest(new URL(`http://localhost:3000/api/blockers/${firstId}`), {
        method: "PUT",
        body: JSON.stringify({ status: "resolved" }),
      }),
      { params: Promise.resolve({ id: String(firstId) }) }
    );

    const req = new NextRequest(new URL("http://localhost:3000/api/blockers?status=open"));
    const res = await GET(req);
    const data = await res.json();

    expect(data.blockers).toHaveLength(1);
    expect(data.blockers[0].status).toBe("open");
  });

  it("returns all blockers without status filter", async () => {
    await createStandupWithBlockers([
      { description: "Blocker A" },
      { description: "Blocker B" },
    ]);

    const allReq = new NextRequest(new URL("http://localhost:3000/api/blockers"));
    const allRes = await GET(allReq);
    const firstId = (await allRes.json()).blockers[0].id;

    await PUT(
      new NextRequest(new URL(`http://localhost:3000/api/blockers/${firstId}`), {
        method: "PUT",
        body: JSON.stringify({ status: "resolved" }),
      }),
      { params: Promise.resolve({ id: String(firstId) }) }
    );

    const req = new NextRequest(new URL("http://localhost:3000/api/blockers"));
    const res = await GET(req);
    const data = await res.json();

    expect(data.blockers).toHaveLength(2);
  });

  it("includes userName from joined standup entry", async () => {
    await createStandupWithBlockers([{ description: "Test blocker" }]);

    const req = new NextRequest(new URL("http://localhost:3000/api/blockers"));
    const res = await GET(req);
    const data = await res.json();

    expect(data.blockers[0].userName).toBe("Alice");
  });

  it("handles database errors", async () => {
    testDb.sqlite.close();

    const req = new NextRequest(new URL("http://localhost:3000/api/blockers"));
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe("PUT /api/blockers/[id]", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("resolves a blocker and sets resolvedAt", async () => {
    await createStandupWithBlockers([{ description: "To resolve" }]);

    const allReq = new NextRequest(new URL("http://localhost:3000/api/blockers"));
    const allRes = await GET(allReq);
    const blockerId = (await allRes.json()).blockers[0].id;

    const res = await PUT(
      new NextRequest(new URL(`http://localhost:3000/api/blockers/${blockerId}`), {
        method: "PUT",
        body: JSON.stringify({ status: "resolved" }),
      }),
      { params: Promise.resolve({ id: String(blockerId) }) }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("resolved");
    expect(data.resolvedAt).toBeTruthy();
  });

  it("updates description", async () => {
    await createStandupWithBlockers([{ description: "Original" }]);

    const allReq = new NextRequest(new URL("http://localhost:3000/api/blockers"));
    const allRes = await GET(allReq);
    const blockerId = (await allRes.json()).blockers[0].id;

    const res = await PUT(
      new NextRequest(new URL(`http://localhost:3000/api/blockers/${blockerId}`), {
        method: "PUT",
        body: JSON.stringify({ description: "Updated" }),
      }),
      { params: Promise.resolve({ id: String(blockerId) }) }
    );
    const data = await res.json();

    expect(data.description).toBe("Updated");
  });

  it("returns 404 for non-existent blocker", async () => {
    const res = await PUT(
      new NextRequest(new URL("http://localhost:3000/api/blockers/999"), {
        method: "PUT",
        body: JSON.stringify({ status: "resolved" }),
      }),
      { params: Promise.resolve({ id: "999" }) }
    );

    expect(res.status).toBe(404);
  });
});
