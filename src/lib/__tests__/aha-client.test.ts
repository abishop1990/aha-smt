import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import {
  getCurrentUser,
  listFeaturesInRelease,
  updateFeatureScore,
  getFeature,
  listReleasesInProduct,
} from "@/lib/aha-client";
import type { AhaFeature, AhaUser, AhaRelease } from "@/lib/aha-types";

// Mock modules
vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(() => ({
    AHA_DOMAIN: "test-domain",
    AHA_API_TOKEN: "test-token",
    CACHE_TTL_SECONDS: 60,
  })),
}));

vi.mock("@/lib/aha-cache", () => ({
  getCacheKey: vi.fn((url: string) => url),
  getFromCache: vi.fn(() => null),
  getStaleFromCache: vi.fn(() => null),
  setInCache: vi.fn(),
  invalidateCache: vi.fn(),
}));

vi.mock("@/lib/aha-rate-limiter", () => ({
  rateLimitedFetch: vi.fn().mockResolvedValue(undefined),
}));

describe("aha-client", () => {
  let mockFetch: Mock;

  beforeEach(() => {
    mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    // Reset all mocks
    vi.clearAllMocks();
  });

  describe("getCurrentUser", () => {
    it("calls fetch with correct URL and auth header", async () => {
      const mockUser: AhaUser = {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      const result = await getCurrentUser();

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test-domain.aha.io/api/v1/me",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
            Accept: "application/json",
          }),
        })
      );
      expect(result).toEqual(mockUser);
    });

    it("handles API error responses", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(getCurrentUser()).rejects.toThrow("Aha API error 500");
    });
  });

  describe("listFeaturesInRelease", () => {
    it("fetches all features without filter", async () => {
      const mockFeatures: AhaFeature[] = [
        {
          id: "feat-1",
          reference_num: "FEAT-1",
          name: "Feature 1",
          score: 5,
          position: 1,
          created_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "feat-2",
          reference_num: "FEAT-2",
          name: "Feature 2",
          score: 8,
          position: 2,
          created_at: "2025-01-02T00:00:00Z",
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          features: mockFeatures,
          pagination: {
            total_pages: 1,
            current_page: 1,
          },
        }),
      });

      const result = await listFeaturesInRelease("release-123");

      expect(result).toEqual(mockFeatures);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/releases/release-123/features"),
        expect.any(Object)
      );
    });

    it("filters unestimated features when option is set", async () => {
      const mockFeatures: AhaFeature[] = [
        {
          id: "feat-1",
          reference_num: "FEAT-1",
          name: "Feature 1",
          score: null,
          position: 1,
          created_at: "2025-01-01T00:00:00Z",
        },
        {
          id: "feat-2",
          reference_num: "FEAT-2",
          name: "Feature 2",
          score: 8,
          position: 2,
          created_at: "2025-01-02T00:00:00Z",
        },
        {
          id: "feat-3",
          reference_num: "FEAT-3",
          name: "Feature 3",
          score: 0,
          position: 3,
          created_at: "2025-01-03T00:00:00Z",
        },
        {
          id: "feat-4",
          reference_num: "FEAT-4",
          name: "Feature 4",
          score: undefined,
          position: 4,
          created_at: "2025-01-04T00:00:00Z",
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          features: mockFeatures,
          pagination: {
            total_pages: 1,
            current_page: 1,
          },
        }),
      });

      const result = await listFeaturesInRelease("release-123", { unestimatedOnly: true });

      expect(result).toHaveLength(3);
      expect(result.map((f) => f.id)).toEqual(["feat-1", "feat-3", "feat-4"]);
    });
  });

  describe("pagination", () => {
    it("fetches and merges multiple pages", async () => {
      const page1Features: AhaFeature[] = [
        {
          id: "feat-1",
          reference_num: "FEAT-1",
          name: "Feature 1",
          position: 1,
          created_at: "2025-01-01T00:00:00Z",
        },
      ];

      const page2Features: AhaFeature[] = [
        {
          id: "feat-2",
          reference_num: "FEAT-2",
          name: "Feature 2",
          position: 2,
          created_at: "2025-01-02T00:00:00Z",
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            features: page1Features,
            pagination: {
              total_pages: 2,
              current_page: 1,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            features: page2Features,
            pagination: {
              total_pages: 2,
              current_page: 2,
            },
          }),
        });

      const result = await listFeaturesInRelease("release-123");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("feat-1");
      expect(result[1].id).toBe("feat-2");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("handles releases with pagination", async () => {
      const page1Releases: AhaRelease[] = [
        {
          id: "rel-1",
          reference_num: "REL-1",
          name: "Release 1",
          progress: 50,
          parking_lot: false,
        },
      ];

      const page2Releases: AhaRelease[] = [
        {
          id: "rel-2",
          reference_num: "REL-2",
          name: "Release 2",
          progress: 75,
          parking_lot: false,
        },
      ];

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            releases: page1Releases,
            pagination: {
              total_pages: 2,
              current_page: 1,
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            releases: page2Releases,
            pagination: {
              total_pages: 2,
              current_page: 2,
            },
          }),
        });

      const result = await listReleasesInProduct("product-123");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("rel-1");
      expect(result[1].id).toBe("rel-2");
    });
  });

  describe("updateFeatureScore", () => {
    it("uses PUT method and correct body format", async () => {
      const mockFeature: AhaFeature = {
        id: "feat-123",
        reference_num: "FEAT-123",
        name: "Test Feature",
        score: 13,
        position: 1,
        created_at: "2025-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ feature: mockFeature }),
      });

      const result = await updateFeatureScore("feat-123", 13);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test-domain.aha.io/api/v1/features/feat-123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ feature: { score: 13 } }),
        })
      );
      expect(result).toEqual(mockFeature);
    });

    it("invalidates cache after update", async () => {
      const { invalidateCache } = await import("@/lib/aha-cache");

      const mockFeature: AhaFeature = {
        id: "feat-123",
        reference_num: "FEAT-123",
        name: "Test Feature",
        score: 8,
        position: 1,
        created_at: "2025-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ feature: mockFeature }),
      });

      await updateFeatureScore("feat-123", 8);

      expect(invalidateCache).toHaveBeenCalledWith("/features/feat-123");
      expect(invalidateCache).toHaveBeenCalledWith("/releases/");
    });
  });

  describe("error handling", () => {
    it("throws error for 401 unauthorized", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      });

      await expect(getCurrentUser()).rejects.toThrow("Aha API error 401");
    });

    it("throws error for 404 not found", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      });

      await expect(getFeature("non-existent")).rejects.toThrow("Aha API error 404");
    });

    it("throws error for 500 internal server error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      });

      await expect(getCurrentUser()).rejects.toThrow("Aha API error 500");
    });

    it("handles empty error text", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => {
          throw new Error("Cannot read text");
        },
      });

      await expect(getCurrentUser()).rejects.toThrow("Aha API error 500");
    });

    it("handles network errors", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      await expect(getCurrentUser()).rejects.toThrow("Network error");
    });
  });

  describe("caching behavior", () => {
    it("uses cache for GET requests", async () => {
      const { getFromCache } = await import("@/lib/aha-cache");

      const mockUser: AhaUser = {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      };

      (getFromCache as Mock).mockReturnValueOnce({ user: mockUser });

      const result = await getCurrentUser();

      expect(result).toEqual(mockUser);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("stores response in cache after GET request", async () => {
      const { setInCache } = await import("@/lib/aha-cache");

      const mockUser: AhaUser = {
        id: "user-123",
        name: "Test User",
        email: "test@example.com",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: mockUser }),
      });

      await getCurrentUser();

      expect(setInCache).toHaveBeenCalledWith(
        expect.any(String),
        { user: mockUser },
        300
      );
    });
  });

  describe("request parameters", () => {
    it("includes query parameters in URL", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [],
          pagination: { total_pages: 1, current_page: 1 },
        }),
      });

      await listFeaturesInRelease("release-123");

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("per_page=200");
      expect(callUrl).toContain("page=1");
      expect(callUrl).toContain("fields=");
    });

    it("handles multiple query parameters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          releases: [],
          pagination: { total_pages: 1, current_page: 1 },
        }),
      });

      await listReleasesInProduct("product-123");

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("per_page=200");
      expect(callUrl).toContain("page=1");
      expect(callUrl).toContain("fields=");
    });
  });
});
