import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useSprintMetrics } from "../use-sprint-metrics";
import type { AhaRelease, AhaIteration, AhaFeature } from "@/lib/aha-types";

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("../use-releases");
vi.mock("../use-iterations");
vi.mock("@/lib/points");

import { useReleases } from "../use-releases";
import { useIterations } from "../use-iterations";
import { getPoints } from "@/lib/points";

const mockUseReleases = vi.mocked(useReleases);
const mockUseIterations = vi.mocked(useIterations);
const mockGetPoints = vi.mocked(getPoints);

// ---------------------------------------------------------------------------
// Global fetch mock
// ---------------------------------------------------------------------------

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
};

function makeFetchOk(features: AhaFeature[]) {
  return {
    ok: true,
    json: async () => ({ features }),
  };
}

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

const mockReleases: AhaRelease[] = [
  {
    id: "rel-1",
    reference_num: "REL-1",
    name: "Sprint 1",
    start_date: "2026-01-01",
    release_date: "2026-01-14",
    parking_lot: false,
    progress: 0,
  },
  {
    id: "rel-2",
    reference_num: "REL-2",
    name: "Sprint 2",
    start_date: "2026-01-15",
    release_date: "2026-01-28",
    parking_lot: false,
    progress: 0,
  },
  {
    id: "rel-3",
    reference_num: "REL-3",
    name: "Parking Lot",
    start_date: "2026-01-01",
    release_date: "2026-12-31",
    parking_lot: true,
    progress: 0,
  },
  {
    id: "rel-4",
    reference_num: "REL-4",
    name: "Undated Release",
    start_date: null,
    release_date: null,
    parking_lot: false,
    progress: 0,
  },
];

const mockIterations: AhaIteration[] = [
  {
    id: "iter-1",
    reference_num: "ITER-1",
    name: "Iteration 1",
    status: "complete",
    start_date: "2026-01-01",
    end_date: "2026-01-14",
  },
  {
    id: "iter-2",
    reference_num: "ITER-2",
    name: "Iteration 2",
    status: "started",
    start_date: "2026-01-15",
    end_date: "2026-01-28",
  },
  {
    id: "iter-3",
    reference_num: "ITER-3",
    name: "Iteration No Date",
    status: "planning",
    start_date: null,
    end_date: null,
  },
];

const user1 = { id: "user-1", name: "Alice" };
const user2 = { id: "user-2", name: "Bob" };

const makeFeature = (
  id: string,
  score: number,
  complete: boolean,
  user?: { id: string; name: string } | null
): AhaFeature => ({
  id,
  reference_num: id.toUpperCase(),
  name: `Feature ${id}`,
  score,
  position: 0,
  created_at: "2026-01-01T00:00:00Z",
  workflow_status: { name: complete ? "Done" : "In Progress", complete },
  assigned_to_user: user ?? undefined,
});

const featuresRel1: AhaFeature[] = [
  makeFeature("f-1", 3, false, user1),
  makeFeature("f-2", 5, true, user1),
  makeFeature("f-3", 2, true, user2),
];

const featuresRel2: AhaFeature[] = [
  makeFeature("f-4", 8, false, user2),
  makeFeature("f-5", 4, true, null),
];

// ---------------------------------------------------------------------------
// beforeEach: set up sensible defaults
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();

  // Default: getPoints returns feature.score ?? 0
  mockGetPoints.mockImplementation((f) => f.score ?? 0);

  // Default: both hooks return data
  mockUseReleases.mockReturnValue({
    data: { releases: mockReleases, productId: "prod-1" },
  } as ReturnType<typeof useReleases>);

  mockUseIterations.mockReturnValue({
    data: { iterations: mockIterations },
  } as ReturnType<typeof useIterations>);
});

// ===========================================================================
// 1. Release mode basics
// ===========================================================================

describe("release mode basics", () => {
  it("fetches features for each non-parking-lot, dated release in parallel", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchOk(featuresRel1)) // rel-2 (newer)
      .mockResolvedValueOnce(makeFetchOk(featuresRel2)); // rel-1 (older after sort)

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Should have called fetch for rel-1 and rel-2 only (not parking lot rel-3 or undated rel-4)
    const fetchedUrls = mockFetch.mock.calls.map((c) => c[0] as string);
    expect(fetchedUrls).toContain("/api/aha/releases/rel-1/features");
    expect(fetchedUrls).toContain("/api/aha/releases/rel-2/features");
    expect(fetchedUrls).not.toContain("/api/aha/releases/rel-3/features");
    expect(fetchedUrls).not.toContain("/api/aha/releases/rel-4/features");
  });

  it("returns metrics sorted chronologically (oldest first)", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchOk(featuresRel2)) // rel-2 fetched first (newer sort desc)
      .mockResolvedValueOnce(makeFetchOk(featuresRel1)); // rel-1 fetched second

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.length).toBe(2);
    // Oldest first
    expect(data[0].startDate).toBe("2026-01-01"); // rel-1
    expect(data[1].startDate).toBe("2026-01-15"); // rel-2
  });

  it("excludes parking_lot releases", async () => {
    mockFetch.mockResolvedValue(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const ids = result.current.data!.map((m) => m.id);
    expect(ids).not.toContain("rel-3");
  });

  it("excludes releases without start_date", async () => {
    mockFetch.mockResolvedValue(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const ids = result.current.data!.map((m) => m.id);
    expect(ids).not.toContain("rel-4");
  });

  it("respects the limit parameter", async () => {
    // Feed only 1 response — limit=1 means only 1 fetch
    mockFetch.mockResolvedValueOnce(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("release", 1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.length).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// 2. Iteration mode basics
// ===========================================================================

describe("iteration mode basics", () => {
  it("fetches features for each iteration using reference_num", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchOk(featuresRel2)) // iter-2 (newer, sorted desc first)
      .mockResolvedValueOnce(makeFetchOk(featuresRel1)); // iter-1

    const { result } = renderHook(() => useSprintMetrics("iteration"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const fetchedUrls = mockFetch.mock.calls.map((c) => c[0] as string);
    expect(fetchedUrls).toContain("/api/aha/iterations/ITER-1/features");
    expect(fetchedUrls).toContain("/api/aha/iterations/ITER-2/features");
    // ITER-3 has no start_date — should be excluded
    expect(fetchedUrls).not.toContain("/api/aha/iterations/ITER-3/features");
  });

  it("returns metrics sorted chronologically (oldest first)", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchOk(featuresRel2)) // iter-2
      .mockResolvedValueOnce(makeFetchOk(featuresRel1)); // iter-1

    const { result } = renderHook(() => useSprintMetrics("iteration"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    expect(data.length).toBe(2);
    expect(data[0].startDate).toBe("2026-01-01"); // iter-1
    expect(data[1].startDate).toBe("2026-01-15"); // iter-2
  });

  it("excludes iterations without start_date", async () => {
    mockFetch.mockResolvedValue(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("iteration"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const ids = result.current.data!.map((m) => m.id);
    expect(ids).not.toContain("iter-3");
  });

  it("uses sourceType=iteration in returned metrics", async () => {
    mockFetch.mockResolvedValue(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("iteration"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    result.current.data!.forEach((m) =>
      expect(m.sourceType).toBe("iteration")
    );
  });

  it("respects the limit parameter for iterations", async () => {
    mockFetch.mockResolvedValueOnce(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("iteration", 1), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data!.length).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

// ===========================================================================
// 3. Metrics calculation
// ===========================================================================

describe("metrics calculation", () => {
  it("calculates totalPointsPlanned as sum of all feature points", async () => {
    // rel-2 is sorted desc first (newer), then rel-1
    mockFetch
      .mockResolvedValueOnce(makeFetchOk(featuresRel2)) // rel-2
      .mockResolvedValueOnce(makeFetchOk(featuresRel1)); // rel-1

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;
    // data[0] = rel-1 (oldest): features f-1(3), f-2(5), f-3(2) => 10
    const rel1Metrics = data.find((m) => m.id === "rel-1")!;
    expect(rel1Metrics.totalPointsPlanned).toBe(10);

    // data[1] = rel-2 (newest): features f-4(8), f-5(4) => 12
    const rel2Metrics = data.find((m) => m.id === "rel-2")!;
    expect(rel2Metrics.totalPointsPlanned).toBe(12);
  });

  it("calculates totalPointsCompleted as sum of completed feature points only", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchOk(featuresRel2))
      .mockResolvedValueOnce(makeFetchOk(featuresRel1));

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;

    // rel-1: f-2(5, complete) + f-3(2, complete) = 7
    const rel1Metrics = data.find((m) => m.id === "rel-1")!;
    expect(rel1Metrics.totalPointsCompleted).toBe(7);

    // rel-2: f-5(4, complete) = 4
    const rel2Metrics = data.find((m) => m.id === "rel-2")!;
    expect(rel2Metrics.totalPointsCompleted).toBe(4);
  });

  it("calculates totalFeaturesPlanned and totalFeaturesCompleted counts", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchOk(featuresRel2))
      .mockResolvedValueOnce(makeFetchOk(featuresRel1));

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const data = result.current.data!;

    // rel-1: 3 features planned, 2 completed
    const rel1Metrics = data.find((m) => m.id === "rel-1")!;
    expect(rel1Metrics.totalFeaturesPlanned).toBe(3);
    expect(rel1Metrics.totalFeaturesCompleted).toBe(2);

    // rel-2: 2 features planned, 1 completed
    const rel2Metrics = data.find((m) => m.id === "rel-2")!;
    expect(rel2Metrics.totalFeaturesPlanned).toBe(2);
    expect(rel2Metrics.totalFeaturesCompleted).toBe(1);
  });

  it("aggregates memberMetrics per user with planned and completed points", async () => {
    mockFetch
      .mockResolvedValueOnce(makeFetchOk(featuresRel2)) // sorted desc: rel-2 first
      .mockResolvedValueOnce(makeFetchOk(featuresRel1));

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const rel1Metrics = result.current.data!.find((m) => m.id === "rel-1")!;

    // user-1 (Alice): f-1(3, incomplete) + f-2(5, complete) => planned=8, completed=5
    expect(rel1Metrics.memberMetrics["user-1"]).toEqual({
      name: "Alice",
      planned: 8,
      completed: 5,
    });

    // user-2 (Bob): f-3(2, complete) => planned=2, completed=2
    expect(rel1Metrics.memberMetrics["user-2"]).toEqual({
      name: "Bob",
      planned: 2,
      completed: 2,
    });
  });

  it("excludes features without assigned_to_user from memberMetrics", async () => {
    // featuresRel2 has f-5 with no assigned_to_user
    mockFetch
      .mockResolvedValueOnce(makeFetchOk(featuresRel2)) // rel-2 desc first
      .mockResolvedValueOnce(makeFetchOk(featuresRel1));

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const rel2Metrics = result.current.data!.find((m) => m.id === "rel-2")!;

    // f-4 assigned to user-2; f-5 unassigned
    expect(rel2Metrics.memberMetrics["user-2"]).toEqual({
      name: "Bob",
      planned: 8,
      completed: 0,
    });
    // No entry for unassigned features
    const memberIds = Object.keys(rel2Metrics.memberMetrics);
    expect(memberIds).toHaveLength(1);
    expect(memberIds).toContain("user-2");
  });

  it("handles an empty feature list with zero metrics", async () => {
    mockUseReleases.mockReturnValue({
      data: {
        releases: [
          {
            id: "rel-empty",
            reference_num: "REL-EMPTY",
            name: "Empty Sprint",
            start_date: "2026-02-01",
            release_date: "2026-02-14",
            parking_lot: false,
            progress: 0,
          },
        ],
        productId: "prod-1",
      },
    } as ReturnType<typeof useReleases>);

    mockFetch.mockResolvedValueOnce(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const metrics = result.current.data![0];
    expect(metrics.totalPointsPlanned).toBe(0);
    expect(metrics.totalPointsCompleted).toBe(0);
    expect(metrics.totalFeaturesPlanned).toBe(0);
    expect(metrics.totalFeaturesCompleted).toBe(0);
    expect(metrics.memberMetrics).toEqual({});
  });

  it("returns correct endDate from release_date in release mode", async () => {
    mockFetch.mockResolvedValue(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const rel1Metrics = result.current.data!.find((m) => m.id === "rel-1")!;
    expect(rel1Metrics.endDate).toBe("2026-01-14");
  });

  it("returns correct endDate from end_date in iteration mode", async () => {
    mockFetch.mockResolvedValue(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("iteration"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const iter1Metrics = result.current.data!.find((m) => m.id === "iter-1")!;
    expect(iter1Metrics.endDate).toBe("2026-01-14");
  });

  it("uses sourceType=release in returned metrics for release mode", async () => {
    mockFetch.mockResolvedValue(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    result.current.data!.forEach((m) =>
      expect(m.sourceType).toBe("release")
    );
  });
});

// ===========================================================================
// 4. Enabled behavior
// ===========================================================================

describe("enabled behavior", () => {
  it("release mode: disabled when releasesData is undefined", () => {
    mockUseReleases.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useReleases>);

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    // Query should not be loading and fetch should not have been called
    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("iteration mode: disabled when iterationsData is undefined", () => {
    mockUseIterations.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useIterations>);

    const { result } = renderHook(() => useSprintMetrics("iteration"), {
      wrapper: createWrapper(),
    });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("release mode: does not use iterationsData for enablement check", async () => {
    // iterationsData is undefined, but releasesData is present — should still run
    mockUseIterations.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useIterations>);

    mockFetch.mockResolvedValue(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // fetch was called (enabled because releasesData is defined)
    expect(mockFetch).toHaveBeenCalled();
  });

  it("iteration mode: does not use releasesData for enablement check", async () => {
    // releasesData is undefined, but iterationsData is present — should still run
    mockUseReleases.mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useReleases>);

    mockFetch.mockResolvedValue(makeFetchOk([]));

    const { result } = renderHook(() => useSprintMetrics("iteration"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalled();
  });

  it("handles a failed fetch gracefully (returns empty features for that release)", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 }) // rel-2 fails
      .mockResolvedValueOnce(makeFetchOk(featuresRel1)); // rel-1 succeeds

    const { result } = renderHook(() => useSprintMetrics("release"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const rel2Metrics = result.current.data!.find((m) => m.id === "rel-2")!;
    expect(rel2Metrics.totalFeaturesPlanned).toBe(0);
    expect(rel2Metrics.totalPointsPlanned).toBe(0);
  });
});

// ===========================================================================
// 5. Query key includes fingerprints
// ===========================================================================

describe("query key includes fingerprints", () => {
  it("fires a new query when releases list changes (different IDs produce different key)", async () => {
    mockFetch.mockResolvedValue(makeFetchOk([]));

    const wrapper = createWrapper();

    // Initial render with default releases
    const { result, rerender } = renderHook(
      () => useSprintMetrics("release"),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstCallCount = mockFetch.mock.calls.length;

    // Change the releases list
    mockUseReleases.mockReturnValue({
      data: {
        releases: [
          {
            id: "rel-new",
            reference_num: "REL-NEW",
            name: "New Sprint",
            start_date: "2026-03-01",
            release_date: "2026-03-14",
            parking_lot: false,
            progress: 0,
          },
        ],
        productId: "prod-1",
      },
    } as ReturnType<typeof useReleases>);

    rerender();

    await waitFor(() =>
      expect(mockFetch.mock.calls.length).toBeGreaterThan(firstCallCount)
    );

    // The new query should fetch for the new release
    const allUrls = mockFetch.mock.calls.map((c) => c[0] as string);
    expect(allUrls).toContain("/api/aha/releases/rel-new/features");
  });

  it("does not re-fetch when the releases list is unchanged (same key)", async () => {
    mockFetch.mockResolvedValue(makeFetchOk([]));

    const wrapper = createWrapper();
    const { result, rerender } = renderHook(
      () => useSprintMetrics("release"),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const firstCallCount = mockFetch.mock.calls.length;

    // Re-render without changing data
    rerender();

    // Allow potential re-fetch cycle
    await new Promise((r) => setTimeout(r, 50));

    // Call count should not have increased (cached)
    expect(mockFetch.mock.calls.length).toBe(firstCallCount);
  });
});
