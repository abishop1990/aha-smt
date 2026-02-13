import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { usePrefetch } from "../use-prefetch";

const mockFetch = vi.fn();
global.fetch = mockFetch;

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

describe("usePrefetch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("prefetches releases", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ releases: [] }),
    });

    const { result } = renderHook(() => usePrefetch(), {
      wrapper: createWrapper(),
    });

    result.current.prefetchReleases();

    // Wait a tick for the prefetch to trigger
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFetch).toHaveBeenCalledWith("/api/aha/releases?");
  });

  it("handles prefetch errors gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => usePrefetch(), {
      wrapper: createWrapper(),
    });

    // Should not throw even if prefetch fails
    expect(() => result.current.prefetchReleases()).not.toThrow();

    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFetch).toHaveBeenCalledWith("/api/aha/releases?");
  });

  it("does not refetch if data is already cached", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ releases: [] }),
    });

    const wrapper = createWrapper();
    const { result: result1 } = renderHook(() => usePrefetch(), { wrapper });

    result1.current.prefetchReleases();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second prefetch should use cache
    const { result: result2 } = renderHook(() => usePrefetch(), { wrapper });
    result2.current.prefetchReleases();
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Should still be 1 call due to cache
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("can be called multiple times without issue", () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ releases: [] }),
    });

    const { result } = renderHook(() => usePrefetch(), {
      wrapper: createWrapper(),
    });

    expect(() => {
      result.current.prefetchReleases();
      result.current.prefetchReleases();
      result.current.prefetchReleases();
    }).not.toThrow();
  });
});
