import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock the aha-client module
vi.mock("@/lib/aha-client", () => ({
  listReleasesInProduct: vi.fn(),
  listProducts: vi.fn(),
}));

// Mock the env module
vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(),
}));

import { listReleasesInProduct, listProducts } from "@/lib/aha-client";
import { getEnv } from "@/lib/env";
import { GET } from "../route";

describe("GET /api/aha/releases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should call listReleasesInProduct with productId from query params", async () => {
    const mockReleases = [
      {
        id: "REL-1",
        reference_num: "R-1",
        name: "Release 1",
        start_date: "2024-01-01",
        parking_lot: false,
      },
    ];

    vi.mocked(listReleasesInProduct).mockResolvedValue(mockReleases);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases?productId=PROD-123")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(listReleasesInProduct).toHaveBeenCalledWith("PROD-123");
    expect(data.releases).toEqual(mockReleases);
    expect(data.productId).toBe("PROD-123");
  });

  it("should use AHA_DEFAULT_PRODUCT_ID from env when productId is not provided", async () => {
    const mockReleases = [
      {
        id: "REL-1",
        reference_num: "R-1",
        name: "Release 1",
        start_date: "2024-01-01",
        parking_lot: false,
      },
    ];

    vi.mocked(getEnv).mockReturnValue({
      AHA_DEFAULT_PRODUCT_ID: "DEFAULT-PROD-456",
    } as any);
    vi.mocked(listReleasesInProduct).mockResolvedValue(mockReleases);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(getEnv).toHaveBeenCalled();
    expect(listReleasesInProduct).toHaveBeenCalledWith("DEFAULT-PROD-456");
    expect(data.releases).toEqual(mockReleases);
    expect(data.productId).toBe("DEFAULT-PROD-456");
  });

  it("should fall back to first non-product-line product from listProducts", async () => {
    const mockProducts = [
      { id: "PROD-COMPANY", name: "Company", product_line: true },
      { id: "PROD-FIRST", name: "First Product", product_line: false },
      { id: "PROD-SECOND", name: "Second Product", product_line: false },
    ];
    const mockReleases = [
      {
        id: "REL-1",
        reference_num: "R-1",
        name: "Release 1",
        start_date: "2024-01-01",
        parking_lot: false,
      },
    ];

    vi.mocked(getEnv).mockReturnValue({} as any);
    vi.mocked(listProducts).mockResolvedValue(mockProducts);
    vi.mocked(listReleasesInProduct).mockResolvedValue(mockReleases);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(listProducts).toHaveBeenCalled();
    expect(listReleasesInProduct).toHaveBeenCalledWith("PROD-FIRST");
    expect(data.releases).toEqual(mockReleases);
    expect(data.productId).toBe("PROD-FIRST");
  });

  it("should include parking_lot releases sorted to the end", async () => {
    const mockReleases = [
      {
        id: "REL-1",
        reference_num: "R-1",
        name: "Active Release",
        start_date: "2024-01-01",
        parking_lot: false,
      },
      {
        id: "REL-2",
        reference_num: "R-2",
        name: "Parking Lot Release",
        start_date: "2024-02-01",
        parking_lot: true,
      },
      {
        id: "REL-3",
        reference_num: "R-3",
        name: "Another Active",
        start_date: "2024-03-01",
        parking_lot: false,
      },
    ];

    vi.mocked(listReleasesInProduct).mockResolvedValue(mockReleases);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases?productId=PROD-123")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.releases).toHaveLength(3);
    // Non-parking-lot first, parking lot last
    expect(data.releases[0].parking_lot).toBe(false);
    expect(data.releases[1].parking_lot).toBe(false);
    expect(data.releases[2].parking_lot).toBe(true);
  });

  it("should sort releases by start_date descending", async () => {
    const mockReleases = [
      {
        id: "REL-1",
        reference_num: "R-1",
        name: "Oldest",
        start_date: "2024-01-01",
        parking_lot: false,
      },
      {
        id: "REL-2",
        reference_num: "R-2",
        name: "Newest",
        start_date: "2024-03-01",
        parking_lot: false,
      },
      {
        id: "REL-3",
        reference_num: "R-3",
        name: "Middle",
        start_date: "2024-02-01",
        parking_lot: false,
      },
    ];

    vi.mocked(listReleasesInProduct).mockResolvedValue(mockReleases);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases?productId=PROD-123")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.releases[0].start_date).toBe("2024-03-01");
    expect(data.releases[1].start_date).toBe("2024-02-01");
    expect(data.releases[2].start_date).toBe("2024-01-01");
  });

  it("should return error on exception", async () => {
    vi.mocked(getEnv).mockReturnValue({} as any);
    vi.mocked(listProducts).mockRejectedValue(new Error("API Error"));

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("API Error");
  });

  it("should return 404 when no products are found", async () => {
    vi.mocked(getEnv).mockReturnValue({} as any);
    vi.mocked(listProducts).mockResolvedValue([]);

    const request = new NextRequest(
      new URL("http://localhost:3000/api/aha/releases")
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("No products found");
  });
});
