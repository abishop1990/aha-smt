import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createTestDb } from "@/lib/db/__tests__/test-db";

let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => testDb.db),
}));

import { GET, PUT } from "../route";

describe("GET /api/settings", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("returns empty object initially", async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({});
  });

  it("handles database errors", async () => {
    testDb.sqlite.close();

    const res = await GET();

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});

describe("PUT /api/settings", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
  });

  it("saves settings and GET returns them", async () => {
    const putReq = new NextRequest(new URL("http://localhost:3000/api/settings"), {
      method: "PUT",
      body: JSON.stringify({
        defaultReleaseId: "REL-123",
        teamName: "Engineering",
      }),
    });

    const putRes = await PUT(putReq);
    const putData = await putRes.json();

    expect(putRes.status).toBe(200);
    expect(putData.success).toBe(true);

    const getRes = await GET();
    const getData = await getRes.json();

    expect(getData.defaultReleaseId).toBe("REL-123");
    expect(getData.teamName).toBe("Engineering");
  });

  it("updates existing settings (upsert)", async () => {
    // First PUT
    const firstReq = new NextRequest(new URL("http://localhost:3000/api/settings"), {
      method: "PUT",
      body: JSON.stringify({
        defaultReleaseId: "REL-123",
      }),
    });
    await PUT(firstReq);

    // Second PUT with update
    const secondReq = new NextRequest(new URL("http://localhost:3000/api/settings"), {
      method: "PUT",
      body: JSON.stringify({
        defaultReleaseId: "REL-456",
        newSetting: "value",
      }),
    });
    await PUT(secondReq);

    const getRes = await GET();
    const getData = await getRes.json();

    expect(getData.defaultReleaseId).toBe("REL-456");
    expect(getData.newSetting).toBe("value");
  });

  it("handles database errors", async () => {
    testDb.sqlite.close();

    const req = new NextRequest(new URL("http://localhost:3000/api/settings"), {
      method: "PUT",
      body: JSON.stringify({ key: "value" }),
    });

    const res = await PUT(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});
