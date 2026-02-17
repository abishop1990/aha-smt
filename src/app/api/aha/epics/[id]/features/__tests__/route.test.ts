import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { NextRequest } from "next/server";
import type { AhaFeature } from "@/lib/aha-types";

vi.mock("@/lib/aha-client", () => ({
  listFeaturesForEpic: vi.fn(),
}));

import { GET } from "../route";
import { listFeaturesForEpic } from "@/lib/aha-client";

const makeRequest = (epicId: string, searchParams?: Record<string, string>) => {
  const url = new URL(`http://localhost:3000/api/aha/epics/${epicId}/features`);
  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      url.searchParams.set(key, value);
    }
  }
  return new NextRequest(url);
};

const makeContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

const mockFeatures: AhaFeature[] = [
  {
    id: "feat-1",
    reference_num: "PRJ-E-1-1",
    name: "Epic Feature 1",
    score: 5,
    position: 1,
    created_at: "2025-01-01T00:00:00Z",
  },
  {
    id: "feat-2",
    reference_num: "PRJ-E-1-2",
    name: "Epic Feature 2",
    score: null,
    position: 2,
    created_at: "2025-01-02T00:00:00Z",
  },
];

describe("GET /api/aha/epics/[id]/features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns features from listFeaturesForEpic", async () => {
    (listFeaturesForEpic as Mock).mockResolvedValue(mockFeatures);

    const req = makeRequest("PRJ-E-1");
    const res = await GET(req, makeContext("PRJ-E-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.features).toEqual(mockFeatures);
    expect(data.total).toBe(2);
    expect(listFeaturesForEpic).toHaveBeenCalledWith("PRJ-E-1", { unestimatedOnly: false });
  });

  it("passes unestimatedOnly: true when ?unestimated=true is set", async () => {
    const unestimatedFeatures = mockFeatures.filter((f) => !f.score);
    (listFeaturesForEpic as Mock).mockResolvedValue(unestimatedFeatures);

    const req = makeRequest("PRJ-E-1", { unestimated: "true" });
    const res = await GET(req, makeContext("PRJ-E-1"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.features).toEqual(unestimatedFeatures);
    expect(data.total).toBe(1);
    expect(listFeaturesForEpic).toHaveBeenCalledWith("PRJ-E-1", { unestimatedOnly: true });
  });

  it("does not pass unestimatedOnly when ?unestimated is not 'true'", async () => {
    (listFeaturesForEpic as Mock).mockResolvedValue(mockFeatures);

    const req = makeRequest("PRJ-E-1", { unestimated: "false" });
    await GET(req, makeContext("PRJ-E-1"));

    expect(listFeaturesForEpic).toHaveBeenCalledWith("PRJ-E-1", { unestimatedOnly: false });
  });

  it("returns 500 when listFeaturesForEpic throws an Error", async () => {
    (listFeaturesForEpic as Mock).mockRejectedValue(new Error("Aha API unavailable"));

    const req = makeRequest("PRJ-E-1");
    const res = await GET(req, makeContext("PRJ-E-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch features");
    expect(data.details).toBe("Aha API unavailable");
  });

  it("returns 500 with 'Unknown error' when a non-Error is thrown", async () => {
    (listFeaturesForEpic as Mock).mockRejectedValue("unexpected string error");

    const req = makeRequest("PRJ-E-1");
    const res = await GET(req, makeContext("PRJ-E-1"));
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBe("Failed to fetch features");
    expect(data.details).toBe("Unknown error");
  });

  it("uses the epic ref from route params", async () => {
    (listFeaturesForEpic as Mock).mockResolvedValue([]);

    const req = makeRequest("MYPROJECT-E-42");
    const res = await GET(req, makeContext("MYPROJECT-E-42"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(0);
    expect(listFeaturesForEpic).toHaveBeenCalledWith("MYPROJECT-E-42", { unestimatedOnly: false });
  });
});
