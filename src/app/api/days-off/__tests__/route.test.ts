import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createTestDb } from "@/lib/db/__tests__/test-db";

let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => testDb.db),
}));

import { GET, POST } from "../route";
import { DELETE } from "../[id]/route";

describe("GET /api/days-off", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("returns empty array initially", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/days-off"));
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.daysOff).toEqual([]);
  });

  it("filters by userId", async () => {
    // Create days off for two users
    await POST(
      new NextRequest(new URL("http://localhost:3000/api/days-off"), {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          userName: "Alice",
          date: "2024-01-15",
          reason: "Vacation",
        }),
      })
    );

    await POST(
      new NextRequest(new URL("http://localhost:3000/api/days-off"), {
        method: "POST",
        body: JSON.stringify({
          userId: "user-2",
          userName: "Bob",
          date: "2024-01-16",
          reason: "Sick day",
        }),
      })
    );

    const req = new NextRequest(new URL("http://localhost:3000/api/days-off?userId=user-1"));
    const res = await GET(req);
    const data = await res.json();

    expect(data.daysOff).toHaveLength(1);
    expect(data.daysOff[0].userId).toBe("user-1");
    expect(data.daysOff[0].userName).toBe("Alice");
  });

  it("filters by date range (startDate/endDate)", async () => {
    // Create days off across different dates
    await POST(
      new NextRequest(new URL("http://localhost:3000/api/days-off"), {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          userName: "Alice",
          date: "2024-01-10",
          reason: "Before range",
        }),
      })
    );

    await POST(
      new NextRequest(new URL("http://localhost:3000/api/days-off"), {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          userName: "Alice",
          date: "2024-01-15",
          reason: "In range",
        }),
      })
    );

    await POST(
      new NextRequest(new URL("http://localhost:3000/api/days-off"), {
        method: "POST",
        body: JSON.stringify({
          userId: "user-1",
          userName: "Alice",
          date: "2024-01-20",
          reason: "After range",
        }),
      })
    );

    const req = new NextRequest(
      new URL("http://localhost:3000/api/days-off?startDate=2024-01-15&endDate=2024-01-17")
    );
    const res = await GET(req);
    const data = await res.json();

    expect(data.daysOff).toHaveLength(1);
    expect(data.daysOff[0].date).toBe("2024-01-15");
    expect(data.daysOff[0].reason).toBe("In range");
  });

  it("handles database errors", async () => {
    testDb.sqlite.close();

    const req = new NextRequest(new URL("http://localhost:3000/api/days-off"));
    const res = await GET(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});

describe("POST /api/days-off", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("creates a day off and returns 201", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/days-off"), {
      method: "POST",
      body: JSON.stringify({
        userId: "user-1",
        userName: "Alice",
        date: "2024-01-15",
        reason: "Vacation",
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.userId).toBe("user-1");
    expect(data.userName).toBe("Alice");
    expect(data.date).toBe("2024-01-15");
    expect(data.reason).toBe("Vacation");
    expect(data.isHoliday).toBe(false);
    expect(data.id).toBeTruthy();
    expect(data.createdAt).toBeTruthy();
  });

  it("creates holiday (isHoliday: true)", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/days-off"), {
      method: "POST",
      body: JSON.stringify({
        date: "2024-12-25",
        reason: "Christmas",
        isHoliday: true,
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.isHoliday).toBe(true);
    expect(data.userId).toBeNull();
    expect(data.userName).toBeNull();
    expect(data.date).toBe("2024-12-25");
    expect(data.reason).toBe("Christmas");
  });
});

describe("DELETE /api/days-off/[id]", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("removes a day off", async () => {
    // Create a day off
    const postReq = new NextRequest(new URL("http://localhost:3000/api/days-off"), {
      method: "POST",
      body: JSON.stringify({
        userId: "user-1",
        userName: "Alice",
        date: "2024-01-15",
        reason: "Vacation",
      }),
    });

    const postRes = await POST(postReq);
    const created = await postRes.json();

    // Delete it
    const deleteRes = await DELETE(
      new NextRequest(new URL(`http://localhost:3000/api/days-off/${created.id}`), {
        method: "DELETE",
      }),
      { params: Promise.resolve({ id: String(created.id) }) }
    );
    const deleteData = await deleteRes.json();

    expect(deleteRes.status).toBe(200);
    expect(deleteData.success).toBe(true);

    // Verify it's gone
    const getReq = new NextRequest(new URL("http://localhost:3000/api/days-off"));
    const getRes = await GET(getReq);
    const getData = await getRes.json();

    expect(getData.daysOff).toHaveLength(0);
  });
});
