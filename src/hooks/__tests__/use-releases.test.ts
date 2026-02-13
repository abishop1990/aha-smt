import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useReleases } from "../use-releases";
import type { AhaRelease } from "@/lib/aha-types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockReleases: AhaRelease[] = [
  {
    id: "rel-1",
    reference_num: "REL-1",
    name: "Sprint 1",
    start_date: "2026-01-01",
    release_date: "2026-01-14",
    parking_lot: false,
  },
  {
    id: "rel-2",
    reference_num: "REL-2",
    name: "Sprint 2",
    start_date: "2026-01-15",
    release_date: "2026-01-28",
    parking_lot: false,
  },
  {
    id: "parking",
    reference_num: "PARK",
    name: "Parking Lot",
    start_date: null,
    release_date: null,
    parking_lot: true,
  },
];

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
    },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
};

describe("useReleases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches releases successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ releases: mockReleases }),
    });

    const { result } = renderHook(() => useReleases(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/aha/releases?");
    expect(result.current.data?.releases).toEqual(mockReleases);
  });

  it("handles empty releases list", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ releases: [] }),
    });

    const { result } = renderHook(() => useReleases(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.releases).toEqual([]);
  });

  it("handles fetch errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useReleases(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  it("caches releases with 5 minute stale time", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ releases: mockReleases }),
    });

    const wrapper = createWrapper();
    const { result: result1 } = renderHook(() => useReleases(), { wrapper });

    await waitFor(() => expect(result1.current.isSuccess).toBe(true));

    // Second hook should use cached data
    const { result: result2 } = renderHook(() => useReleases(), { wrapper });

    expect(result2.current.isSuccess).toBe(true);
    expect(result2.current.data?.releases).toEqual(mockReleases);

    // Should only have called fetch once due to cache
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("includes parking lot releases", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ releases: mockReleases }),
    });

    const { result } = renderHook(() => useReleases(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const parkingLot = result.current.data?.releases.find((r) => r.parking_lot);
    expect(parkingLot).toBeDefined();
    expect(parkingLot?.name).toBe("Parking Lot");
  });

  it("handles releases with null dates", async () => {
    const releasesWithNullDates: AhaRelease[] = [
      {
        id: "rel-1",
        reference_num: "REL-1",
        name: "No Dates Sprint",
        start_date: null,
        release_date: null,
        parking_lot: false,
      },
    ];

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ releases: releasesWithNullDates }),
    });

    const { result } = renderHook(() => useReleases(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.releases[0].start_date).toBeNull();
    expect(result.current.data?.releases[0].release_date).toBeNull();
  });
});
