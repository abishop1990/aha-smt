import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createTestDb } from "@/lib/db/__tests__/test-db";

let testDb: ReturnType<typeof createTestDb>;

vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => testDb.db),
}));

vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(() => ({ AHA_DOMAIN: "testcompany" })),
  __resetEnv: vi.fn(),
}));

import { GET, PUT } from "../route";
import { getEnv } from "@/lib/env";

const mockGetEnv = vi.mocked(getEnv);

describe("GET /api/settings", () => {
  beforeEach(() => {
    testDb = createTestDb();
    vi.clearAllMocks();
    mockGetEnv.mockReturnValue({ AHA_DOMAIN: "testcompany" } as ReturnType<typeof getEnv>);
  });

  it("returns empty object with ahaDomain when no DB settings exist", async () => {
    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({ ahaDomain: "testcompany" });
  });

  it("includes ahaDomain from AHA_DOMAIN env var alongside DB settings", async () => {
    const putReq = new NextRequest(new URL("http://localhost:3000/api/settings"), {
      method: "PUT",
      body: JSON.stringify({ defaultPointsPerDay: "2" }),
    });
    await PUT(putReq);

    const res = await GET();
    const data = await res.json();

    expect(data.defaultPointsPerDay).toBe("2");
    expect(data.ahaDomain).toBe("testcompany");
  });

  it("omits ahaDomain when env is unavailable", async () => {
    mockGetEnv.mockImplementation(() => { throw new Error("env not configured"); });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ahaDomain).toBeUndefined();
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
        defaultPointsPerDay: "2",
        standup_user_ids: '["user-1","user-2"]',
      }),
    });

    const putRes = await PUT(putReq);
    const putData = await putRes.json();

    expect(putRes.status).toBe(200);
    expect(putData.success).toBe(true);

    const getRes = await GET();
    const getData = await getRes.json();

    expect(getData.defaultPointsPerDay).toBe("2");
    expect(getData.standup_user_ids).toBe('["user-1","user-2"]');
  });

  it("updates existing settings (upsert)", async () => {
    // First PUT
    const firstReq = new NextRequest(new URL("http://localhost:3000/api/settings"), {
      method: "PUT",
      body: JSON.stringify({ defaultPointsPerDay: "1" }),
    });
    await PUT(firstReq);

    // Second PUT with update
    const secondReq = new NextRequest(new URL("http://localhost:3000/api/settings"), {
      method: "PUT",
      body: JSON.stringify({ defaultPointsPerDay: "3" }),
    });
    await PUT(secondReq);

    const getRes = await GET();
    const getData = await getRes.json();

    expect(getData.defaultPointsPerDay).toBe("3");
  });

  it("rejects unknown setting keys with 400", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/settings"), {
      method: "PUT",
      body: JSON.stringify({ unknownKey: "value", anotherBadKey: "x" }),
    });

    const res = await PUT(req);

    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });

  it("silently ignores unknown keys but saves valid ones", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/settings"), {
      method: "PUT",
      body: JSON.stringify({ defaultPointsPerDay: "5", badKey: "ignored" }),
    });

    const res = await PUT(req);

    expect(res.status).toBe(200);

    const getRes = await GET();
    const getData = await getRes.json();

    expect(getData.defaultPointsPerDay).toBe("5");
    expect(getData.badKey).toBeUndefined();
  });

  it("handles database errors", async () => {
    testDb.sqlite.close();

    const req = new NextRequest(new URL("http://localhost:3000/api/settings"), {
      method: "PUT",
      body: JSON.stringify({ defaultPointsPerDay: "1" }),
    });

    const res = await PUT(req);

    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toBeTruthy();
  });
});
