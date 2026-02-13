import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";
import {
  getCurrentUser,
  listFeaturesInRelease,
  updateFeatureScore,
  getFeature,
  listReleasesInProduct,
  getRelease,
  listFeaturesPage,
  listTeams,
  listUsersInProduct,
  listProducts,
  updateFeatureWorkUnits,
  updateFeatureEstimate,
  listIterations,
  getIteration,
  listFeaturesInIteration,
} from "@/lib/aha-client";
import type { AhaFeature, AhaUser, AhaRelease, AhaTeam, AhaProduct } from "@/lib/aha-types";

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

  describe("getRelease", () => {
    it("fetches single release by ID", async () => {
      const mockRelease: AhaRelease = {
        id: "rel-123",
        reference_num: "REL-123",
        name: "Sprint 2024.1",
        start_date: "2024-01-01",
        release_date: "2024-01-31",
        progress: 60,
        parking_lot: false,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ release: mockRelease }),
      });

      const result = await getRelease("rel-123");

      expect(result).toEqual(mockRelease);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/releases/rel-123"),
        expect.objectContaining({
          method: "GET",
        })
      );
    });

    it("includes specific fields in query parameters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          release: {
            id: "rel-123",
            reference_num: "REL-123",
            name: "Sprint",
            progress: 0,
            parking_lot: false,
          },
        }),
      });

      await getRelease("rel-123");

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("fields=");
      expect(callUrl).toContain("id");
      expect(callUrl).toContain("reference_num");
    });
  });

  describe("getFeature", () => {
    it("fetches single feature with full field set", async () => {
      const mockFeature: AhaFeature = {
        id: "feat-123",
        reference_num: "FEAT-123",
        name: "Test Feature",
        score: 5,
        work_units: 3,
        original_estimate: 8,
        position: 1,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-02T00:00:00Z",
        description: { body: "Full description" },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ feature: mockFeature }),
      });

      const result = await getFeature("feat-123");

      expect(result).toEqual(mockFeature);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/features/feat-123"),
        expect.any(Object)
      );
    });

    it("includes description and requirements fields", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          feature: {
            id: "feat-123",
            reference_num: "FEAT-123",
            name: "Feature",
            position: 1,
            created_at: "2024-01-01T00:00:00Z",
          },
        }),
      });

      await getFeature("feat-123");

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("description");
      expect(callUrl).toContain("requirements");
      expect(callUrl).toContain("release");
    });
  });

  describe("listFeaturesPage", () => {
    it("fetches a single page of features", async () => {
      const mockFeatures: AhaFeature[] = [
        {
          id: "feat-1",
          reference_num: "FEAT-1",
          name: "Feature 1",
          position: 1,
          created_at: "2024-01-01T00:00:00Z",
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          features: mockFeatures,
          pagination: {
            total_records: 100,
            total_pages: 5,
            current_page: 2,
            per_page: 20,
          },
        }),
      });

      const result = await listFeaturesPage("release-123", 2, 20);

      expect(result.features).toEqual(mockFeatures);
      expect(result.pagination.current_page).toBe(2);
      expect(result.pagination.total_pages).toBe(5);
      expect(mockFetch).toHaveBeenCalledOnce();
    });

    it("uses default page and perPage parameters", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [],
          pagination: { total_records: 0, total_pages: 1, current_page: 1, per_page: 200 },
        }),
      });

      await listFeaturesPage("release-123");

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("page=1");
      expect(callUrl).toContain("per_page=200");
    });

    it("returns empty features array when none exist", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          pagination: { total_records: 0, total_pages: 0, current_page: 1, per_page: 200 },
        }),
      });

      const result = await listFeaturesPage("release-123");

      expect(result.features).toEqual([]);
    });
  });

  describe("listTeams", () => {
    it("fetches all teams with pagination", async () => {
      const mockTeams: AhaTeam[] = [
        {
          id: "team-1",
          name: "Team Alpha",
          team_members: [{ user: { id: "u-1", name: "Alice", email: "alice@test.com" } }],
        },
        {
          id: "team-2",
          name: "Team Beta",
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          project_teams: mockTeams,
          pagination: { total_pages: 1, current_page: 1 },
        }),
      });

      const result = await listTeams();

      expect(result).toEqual(mockTeams);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/project_teams"),
        expect.any(Object)
      );
    });

    it("uses project_teams data key for pagination", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          project_teams: [{ id: "team-1", name: "Team" }],
          pagination: { total_pages: 1, current_page: 1 },
        }),
      });

      const result = await listTeams();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("team-1");
    });
  });

  describe("listUsersInProduct", () => {
    it("fetches all users in a product", async () => {
      const mockUsers: AhaUser[] = [
        { id: "user-1", name: "Alice", email: "alice@test.com" },
        { id: "user-2", name: "Bob", email: "bob@test.com" },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          project_users: mockUsers.map((u) => ({ user: u })),
          pagination: { total_pages: 1, current_page: 1 },
        }),
      });

      const result = await listUsersInProduct("product-123");

      expect(result).toEqual(mockUsers);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/products/product-123/users"),
        expect.any(Object)
      );
    });

    it("uses project_users data key for pagination", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          project_users: [{ user: { id: "u-1", name: "Alice", email: "a@test.com" } }],
          pagination: { total_pages: 1, current_page: 1 },
        }),
      });

      const result = await listUsersInProduct("product-123");

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe("Alice");
    });
  });

  describe("listProducts", () => {
    it("fetches all products", async () => {
      const mockProducts: AhaProduct[] = [
        {
          id: "prod-1",
          reference_prefix: "PROJ",
          name: "Project Alpha",
          product_line: false,
          workspace_type: "standard",
        },
        {
          id: "prod-2",
          reference_prefix: "WEB",
          name: "Web App",
          product_line: true,
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          products: mockProducts,
          pagination: { total_pages: 1, current_page: 1 },
        }),
      });

      const result = await listProducts();

      expect(result).toEqual(mockProducts);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/products"),
        expect.any(Object)
      );
    });

    it("includes specific fields for products", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          products: [],
          pagination: { total_pages: 1, current_page: 1 },
        }),
      });

      await listProducts();

      const callUrl = mockFetch.mock.calls[0][0];
      expect(callUrl).toContain("fields=");
      expect(callUrl).toContain("reference_prefix");
      expect(callUrl).toContain("workspace_type");
    });
  });

  describe("updateFeatureWorkUnits", () => {
    it("uses PUT method with work_units in body", async () => {
      const mockFeature: AhaFeature = {
        id: "feat-123",
        reference_num: "FEAT-123",
        name: "Test Feature",
        work_units: 5,
        position: 1,
        created_at: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ feature: mockFeature }),
      });

      const result = await updateFeatureWorkUnits("feat-123", 5);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test-domain.aha.io/api/v1/features/feat-123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ feature: { work_units: 5 } }),
        })
      );
      expect(result).toEqual(mockFeature);
    });

    it("invalidates cache after update", async () => {
      const { invalidateCache } = await import("@/lib/aha-cache");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          feature: {
            id: "feat-123",
            reference_num: "FEAT-123",
            name: "Feature",
            work_units: 3,
            position: 1,
            created_at: "2024-01-01T00:00:00Z",
          },
        }),
      });

      await updateFeatureWorkUnits("feat-123", 3);

      expect(invalidateCache).toHaveBeenCalledWith("/features/feat-123");
      expect(invalidateCache).toHaveBeenCalledWith("/products/");
    });
  });

  describe("updateFeatureEstimate", () => {
    it("uses PUT method with original_estimate in body", async () => {
      const mockFeature: AhaFeature = {
        id: "feat-123",
        reference_num: "FEAT-123",
        name: "Test Feature",
        original_estimate: 8,
        position: 1,
        created_at: "2024-01-01T00:00:00Z",
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ feature: mockFeature }),
      });

      const result = await updateFeatureEstimate("feat-123", 8);

      expect(mockFetch).toHaveBeenCalledWith(
        "https://test-domain.aha.io/api/v1/features/feat-123",
        expect.objectContaining({
          method: "PUT",
          body: JSON.stringify({ feature: { original_estimate: 8 } }),
        })
      );
      expect(result).toEqual(mockFeature);
    });

    it("invalidates cache after update", async () => {
      const { invalidateCache } = await import("@/lib/aha-cache");

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          feature: {
            id: "feat-123",
            reference_num: "FEAT-123",
            name: "Feature",
            original_estimate: 13,
            position: 1,
            created_at: "2024-01-01T00:00:00Z",
          },
        }),
      });

      await updateFeatureEstimate("feat-123", 13);

      expect(invalidateCache).toHaveBeenCalledWith("/features/feat-123");
      expect(invalidateCache).toHaveBeenCalledWith("/products/");
    });
  });

  describe("listIterations (GraphQL)", () => {
    it("fetches iterations via GraphQL endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            iterations: {
              nodes: [
                {
                  id: "iter-1",
                  name: "Sprint 1",
                  referenceNum: "SPRINT-1",
                  status: 20,
                  startDate: "2024-01-08",
                  endDate: "2024-01-19",
                  capacity: { value: 40, units: "points" },
                  records: [],
                },
              ],
              isLastPage: true,
            },
          },
        }),
      });

      const result = await listIterations("product-123");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("iter-1");
      expect(result[0].status).toBe("started");
      expect(result[0].capacity).toBe(40);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://test-domain.aha.io/api/v2/graphql",
        expect.objectContaining({
          method: "POST",
        })
      );
    });

    it("handles multi-page iteration results", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              iterations: {
                nodes: [
                  {
                    id: "iter-1",
                    name: "Sprint 1",
                    referenceNum: "SPRINT-1",
                    status: 30,
                    startDate: null,
                    endDate: null,
                    capacity: null,
                    records: [],
                  },
                ],
                isLastPage: false,
              },
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: {
              iterations: {
                nodes: [
                  {
                    id: "iter-2",
                    name: "Sprint 2",
                    referenceNum: "SPRINT-2",
                    status: 10,
                    startDate: null,
                    endDate: null,
                    capacity: null,
                    records: [],
                  },
                ],
                isLastPage: true,
              },
            },
          }),
        });

      const result = await listIterations("product-123");

      expect(result).toHaveLength(2);
      expect(result[0].status).toBe("complete");
      expect(result[1].status).toBe("planning");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("maps status codes correctly", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            iterations: {
              nodes: [
                {
                  id: "iter-1",
                  name: "Planning",
                  referenceNum: "SPRINT-1",
                  status: 10,
                  startDate: null,
                  endDate: null,
                  capacity: null,
                  records: [],
                },
                {
                  id: "iter-2",
                  name: "Started",
                  referenceNum: "SPRINT-2",
                  status: 20,
                  startDate: null,
                  endDate: null,
                  capacity: null,
                  records: [],
                },
                {
                  id: "iter-3",
                  name: "Complete",
                  referenceNum: "SPRINT-3",
                  status: 30,
                  startDate: null,
                  endDate: null,
                  capacity: null,
                  records: [],
                },
              ],
              isLastPage: true,
            },
          },
        }),
      });

      const result = await listIterations("product-123");

      expect(result[0].status).toBe("planning");
      expect(result[1].status).toBe("started");
      expect(result[2].status).toBe("complete");
    });
  });

  describe("getIteration", () => {
    it("finds iteration by reference number", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            iterations: {
              nodes: [
                {
                  id: "iter-1",
                  name: "Sprint 1",
                  referenceNum: "SPRINT-1",
                  status: 20,
                  startDate: "2024-01-08",
                  endDate: "2024-01-19",
                  capacity: { value: 40, units: "points" },
                  records: [],
                },
                {
                  id: "iter-2",
                  name: "Sprint 2",
                  referenceNum: "SPRINT-2",
                  status: 10,
                  startDate: null,
                  endDate: null,
                  capacity: null,
                  records: [],
                },
              ],
              isLastPage: true,
            },
          },
        }),
      });

      const result = await getIteration("product-123", "SPRINT-2");

      expect(result).toBeDefined();
      expect(result?.id).toBe("iter-2");
      expect(result?.reference_num).toBe("SPRINT-2");
    });

    it("returns undefined for non-existent iteration", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            iterations: {
              nodes: [
                {
                  id: "iter-1",
                  name: "Sprint 1",
                  referenceNum: "SPRINT-1",
                  status: 20,
                  startDate: null,
                  endDate: null,
                  capacity: null,
                  records: [],
                },
              ],
              isLastPage: true,
            },
          },
        }),
      });

      const result = await getIteration("product-123", "SPRINT-999");

      expect(result).toBeUndefined();
    });
  });

  describe("listFeaturesInIteration", () => {
    it("extracts and maps features from iteration records", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            iterations: {
              nodes: [
                {
                  id: "iter-1",
                  name: "Sprint 1",
                  referenceNum: "SPRINT-1",
                  status: 20,
                  startDate: "2024-01-08",
                  endDate: "2024-01-19",
                  capacity: { value: 40, units: "points" },
                  records: [
                    {
                      id: "feat-1",
                      referenceNum: "FEAT-1",
                      name: "Feature 1",
                      originalEstimate: { value: 5, units: "points" },
                      workflowStatus: {
                        id: "ws-1",
                        name: "In Progress",
                        color: 255,
                        position: 2,
                        internalMeaning: null,
                      },
                      assignedToUser: { id: "user-1", name: "Alice", email: "alice@test.com" },
                      tags: [{ name: "frontend" }],
                      createdAt: "2024-01-01T00:00:00Z",
                    },
                    {
                      id: "feat-2",
                      referenceNum: "FEAT-2",
                      name: "Feature 2",
                      originalEstimate: { value: 8, units: "points" },
                      workflowStatus: {
                        id: "ws-2",
                        name: "Done",
                        color: 65280,
                        position: 4,
                        internalMeaning: "DONE",
                      },
                      assignedToUser: null,
                      tags: null,
                      createdAt: "2024-01-02T00:00:00Z",
                    },
                  ],
                },
              ],
              isLastPage: true,
            },
          },
        }),
      });

      const result = await listFeaturesInIteration("product-123", "SPRINT-1");

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe("feat-1");
      expect(result[0].original_estimate).toBe(5);
      expect(result[0].workflow_status?.color).toBe("#0000ff");
      expect(result[0].workflow_status?.complete).toBe(false);
      expect(result[0].assigned_to_user?.name).toBe("Alice");
      expect(result[0].tags).toEqual(["frontend"]);

      expect(result[1].id).toBe("feat-2");
      expect(result[1].workflow_status?.color).toBe("#00ff00");
      expect(result[1].workflow_status?.complete).toBe(true);
      expect(result[1].assigned_to_user).toBeNull();
      expect(result[1].tags).toBeUndefined();
    });

    it("returns empty array for non-existent iteration", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            iterations: {
              nodes: [],
              isLastPage: true,
            },
          },
        }),
      });

      const result = await listFeaturesInIteration("product-123", "SPRINT-999");

      expect(result).toEqual([]);
    });

    it("filters unestimated features when option is set", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          data: {
            iterations: {
              nodes: [
                {
                  id: "iter-1",
                  name: "Sprint 1",
                  referenceNum: "SPRINT-1",
                  status: 20,
                  startDate: null,
                  endDate: null,
                  capacity: null,
                  records: [
                    {
                      id: "feat-1",
                      referenceNum: "FEAT-1",
                      name: "Feature 1",
                      originalEstimate: null,
                      workflowStatus: null,
                      assignedToUser: null,
                      tags: null,
                      createdAt: "2024-01-01T00:00:00Z",
                    },
                    {
                      id: "feat-2",
                      referenceNum: "FEAT-2",
                      name: "Feature 2",
                      originalEstimate: { value: 5, units: "points" },
                      workflowStatus: null,
                      assignedToUser: null,
                      tags: null,
                      createdAt: "2024-01-02T00:00:00Z",
                    },
                  ],
                },
              ],
              isLastPage: true,
            },
          },
        }),
      });

      const result = await listFeaturesInIteration("product-123", "SPRINT-1", { unestimatedOnly: true });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("feat-1");
    });
  });

  describe("stale-while-revalidate", () => {
    it("returns stale data without awaiting fetch", async () => {
      const { getStaleFromCache } = await import("@/lib/aha-cache");

      const mockUser: AhaUser = {
        id: "user-123",
        name: "Stale User",
        email: "stale@test.com",
      };

      (getStaleFromCache as Mock).mockReturnValueOnce({
        isStale: true,
        data: { user: mockUser },
      });

      // Mock fetch should not be called immediately
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ user: { ...mockUser, name: "Fresh User" } }),
      });

      const result = await getCurrentUser();

      // Should return stale data
      expect(result).toEqual(mockUser);
      expect(result.name).toBe("Stale User");

      // Fetch should have been called but we don't await it
      // Small delay to allow background refresh to potentially start
      await new Promise((resolve) => setTimeout(resolve, 10));
    });

    it("serves stale data for getFeature", async () => {
      const { getStaleFromCache } = await import("@/lib/aha-cache");

      const mockFeature: AhaFeature = {
        id: "feat-123",
        reference_num: "FEAT-123",
        name: "Stale Feature",
        position: 1,
        created_at: "2024-01-01T00:00:00Z",
      };

      (getStaleFromCache as Mock).mockReturnValueOnce({
        isStale: true,
        data: { feature: mockFeature },
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ feature: { ...mockFeature, name: "Fresh Feature" } }),
      });

      const result = await getFeature("feat-123");

      // Should return stale data immediately
      expect(result).toEqual(mockFeature);
      expect(result.name).toBe("Stale Feature");

      // Background refresh should be triggered but not awaited
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
  });

  describe("sequential requests", () => {
    it("makes separate fetches for different feature IDs", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            feature: {
              id: "feat-1",
              reference_num: "FEAT-1",
              name: "Feature 1",
              position: 1,
              created_at: "2024-01-01T00:00:00Z",
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            feature: {
              id: "feat-2",
              reference_num: "FEAT-2",
              name: "Feature 2",
              position: 2,
              created_at: "2024-01-02T00:00:00Z",
            },
          }),
        });

      const [result1, result2] = await Promise.all([getFeature("feat-1"), getFeature("feat-2")]);

      expect(result1.id).toBe("feat-1");
      expect(result2.id).toBe("feat-2");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("makes separate PUT requests for updates", async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            feature: {
              id: "feat-1",
              reference_num: "FEAT-1",
              name: "Feature 1",
              score: 5,
              position: 1,
              created_at: "2024-01-01T00:00:00Z",
            },
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            feature: {
              id: "feat-1",
              reference_num: "FEAT-1",
              name: "Feature 1",
              score: 8,
              position: 1,
              created_at: "2024-01-01T00:00:00Z",
            },
          }),
        });

      await updateFeatureScore("feat-1", 5);
      await updateFeatureScore("feat-1", 8);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch.mock.calls[0][1].method).toBe("PUT");
      expect(mockFetch.mock.calls[1][1].method).toBe("PUT");
    });
  });
});
