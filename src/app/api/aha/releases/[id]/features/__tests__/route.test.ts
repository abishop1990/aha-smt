import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the aha-client module
vi.mock("@/lib/aha-client", () => ({
  listFeaturesInRelease: vi.fn(),
  listFeaturesPage: vi.fn(),
}));

import { listFeaturesInRelease } from "@/lib/aha-client";
import { GET } from "../route";

describe("GET /api/aha/releases/[id]/features", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return features for release ID", async () => {
    const mockFeatures = [
      {
        id: "FEAT-1",
        reference_num: "F-1",
        name: "Feature 1",
        workflow_status: { name: "In Progress" },
      },
      {
        id: "FEAT-2",
        reference_num: "F-2",
        name: "Feature 2",
        workflow_status: { name: "Done" },
      },
    ];

    vi.mocked(listFeaturesInRelease).mockResolvedValue(mockFeatures);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases/REL-123/features")
    );

    const params = Promise.resolve({ id: "REL-123" });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(listFeaturesInRelease).toHaveBeenCalledWith("REL-123", {
      unestimatedOnly: false,
    });
    expect(data.features).toEqual(mockFeatures);
    expect(data.total).toBe(2);
  });

  it("should pass unestimatedOnly option when unestimated query param is true", async () => {
    const mockFeatures = [
      {
        id: "FEAT-1",
        reference_num: "F-1",
        name: "Unestimated Feature",
        workflow_status: { name: "Ready" },
      },
    ];

    vi.mocked(listFeaturesInRelease).mockResolvedValue(mockFeatures);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases/REL-123/features?unestimated=true")
    );

    const params = Promise.resolve({ id: "REL-123" });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(listFeaturesInRelease).toHaveBeenCalledWith("REL-123", {
      unestimatedOnly: true,
    });
    expect(data.features).toEqual(mockFeatures);
    expect(data.total).toBe(1);
  });

  it("should return total count in response", async () => {
    const mockFeatures = [
      { id: "FEAT-1", reference_num: "F-1", name: "Feature 1" },
      { id: "FEAT-2", reference_num: "F-2", name: "Feature 2" },
      { id: "FEAT-3", reference_num: "F-3", name: "Feature 3" },
      { id: "FEAT-4", reference_num: "F-4", name: "Feature 4" },
    ];

    vi.mocked(listFeaturesInRelease).mockResolvedValue(mockFeatures);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases/REL-456/features")
    );

    const params = Promise.resolve({ id: "REL-456" });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(data.total).toBe(4);
    expect(data.features).toHaveLength(4);
  });

  it("should handle errors and return 500", async () => {
    vi.mocked(listFeaturesInRelease).mockRejectedValue(
      new Error("Failed to fetch from Aha!")
    );

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases/REL-999/features")
    );

    const params = Promise.resolve({ id: "REL-999" });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch from Aha!");
  });

  it("should handle non-Error exceptions", async () => {
    vi.mocked(listFeaturesInRelease).mockRejectedValue("Unknown error");

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases/REL-999/features")
    );

    const params = Promise.resolve({ id: "REL-999" });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to fetch features");
  });

  it("should return empty array when no features are found", async () => {
    vi.mocked(listFeaturesInRelease).mockResolvedValue([]);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases/REL-EMPTY/features")
    );

    const params = Promise.resolve({ id: "REL-EMPTY" });
    const response = await GET(request, { params });
    const data = await response.json();

    expect(data.features).toEqual([]);
    expect(data.total).toBe(0);
  });
});
