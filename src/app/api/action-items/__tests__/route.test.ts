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

async function createStandupWithActionItems(items: Array<{ description: string; assigneeUserId?: string | null }>) {
  const req = new NextRequest(new URL("http://localhost:3000/api/standups"), {
    method: "POST",
    body: JSON.stringify({
      userId: "user-1",
      userName: "Alice",
      standupDate: "2024-01-15",
      doneSinceLastStandup: "Work",
      workingOnNow: "More work",
      blockers: "",
      actionItems: "",
      actionItemEntries: items,
    }),
  });
  const res = await standupPOST(req);
  return res.json();
}

describe("GET /api/action-items", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("returns empty array initially", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/action-items"));
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.actionItems).toEqual([]);
  });

  it("returns action items after creation via standup", async () => {
    await createStandupWithActionItems([
      { description: "Update docs" },
      { description: "Schedule meeting", assigneeUserId: "user-2" },
    ]);

    const req = new NextRequest(new URL("http://localhost:3000/api/action-items"));
    const res = await GET(req);
    const data = await res.json();

    expect(data.actionItems).toHaveLength(2);
  });

  it("filters by completed=false", async () => {
    await createStandupWithActionItems([
      { description: "Item 1" },
      { description: "Item 2" },
    ]);

    // Get all and complete the first
    const allReq = new NextRequest(new URL("http://localhost:3000/api/action-items"));
    const allRes = await GET(allReq);
    const firstId = (await allRes.json()).actionItems[0].id;

    await PUT(
      new NextRequest(new URL(`http://localhost:3000/api/action-items/${firstId}`), {
        method: "PUT",
        body: JSON.stringify({ completed: true }),
      }),
      { params: Promise.resolve({ id: String(firstId) }) }
    );

    const req = new NextRequest(new URL("http://localhost:3000/api/action-items?completed=false"));
    const res = await GET(req);
    const data = await res.json();

    expect(data.actionItems).toHaveLength(1);
    expect(data.actionItems[0].completed).toBe(false);
  });

  it("filters by completed=true", async () => {
    await createStandupWithActionItems([
      { description: "Item A" },
      { description: "Item B" },
    ]);

    const allReq = new NextRequest(new URL("http://localhost:3000/api/action-items"));
    const allRes = await GET(allReq);
    const firstId = (await allRes.json()).actionItems[0].id;

    await PUT(
      new NextRequest(new URL(`http://localhost:3000/api/action-items/${firstId}`), {
        method: "PUT",
        body: JSON.stringify({ completed: true }),
      }),
      { params: Promise.resolve({ id: String(firstId) }) }
    );

    const req = new NextRequest(new URL("http://localhost:3000/api/action-items?completed=true"));
    const res = await GET(req);
    const data = await res.json();

    expect(data.actionItems).toHaveLength(1);
    expect(data.actionItems[0].completed).toBe(true);
    expect(data.actionItems[0].completedAt).toBeTruthy();
  });

  it("includes userName from joined standup entry", async () => {
    await createStandupWithActionItems([{ description: "Test item" }]);

    const req = new NextRequest(new URL("http://localhost:3000/api/action-items"));
    const res = await GET(req);
    const data = await res.json();

    expect(data.actionItems[0].userName).toBe("Alice");
  });

  it("handles database errors", async () => {
    testDb.sqlite.close();

    const req = new NextRequest(new URL("http://localhost:3000/api/action-items"));
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

describe("PUT /api/action-items/[id]", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("marks item as completed and sets completedAt", async () => {
    await createStandupWithActionItems([{ description: "Complete me" }]);

    const allReq = new NextRequest(new URL("http://localhost:3000/api/action-items"));
    const allRes = await GET(allReq);
    const itemId = (await allRes.json()).actionItems[0].id;

    const res = await PUT(
      new NextRequest(new URL(`http://localhost:3000/api/action-items/${itemId}`), {
        method: "PUT",
        body: JSON.stringify({ completed: true }),
      }),
      { params: Promise.resolve({ id: String(itemId) }) }
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.completed).toBe(true);
    expect(data.completedAt).toBeTruthy();
  });

  it("marks completed item as incomplete and clears completedAt", async () => {
    await createStandupWithActionItems([{ description: "Toggle me" }]);

    const allReq = new NextRequest(new URL("http://localhost:3000/api/action-items"));
    const allRes = await GET(allReq);
    const itemId = (await allRes.json()).actionItems[0].id;

    // Complete first
    await PUT(
      new NextRequest(new URL(`http://localhost:3000/api/action-items/${itemId}`), {
        method: "PUT",
        body: JSON.stringify({ completed: true }),
      }),
      { params: Promise.resolve({ id: String(itemId) }) }
    );

    // Un-complete
    const res = await PUT(
      new NextRequest(new URL(`http://localhost:3000/api/action-items/${itemId}`), {
        method: "PUT",
        body: JSON.stringify({ completed: false }),
      }),
      { params: Promise.resolve({ id: String(itemId) }) }
    );
    const data = await res.json();

    expect(data.completed).toBe(false);
    expect(data.completedAt).toBeNull();
  });

  it("returns 404 for non-existent item", async () => {
    const res = await PUT(
      new NextRequest(new URL("http://localhost:3000/api/action-items/999"), {
        method: "PUT",
        body: JSON.stringify({ completed: true }),
      }),
      { params: Promise.resolve({ id: "999" }) }
    );

    expect(res.status).toBe(404);
  });
});
