import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useProductFeatures } from "../use-product-features";
import type { AhaFeature } from "@/lib/aha-types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockFeature: AhaFeature = {
  id: "feat-1",
  reference_num: "FEAT-1",
  name: "Test Feature",
  score: 5,
  work_units: 5,
  original_estimate: 5,
  workflow_status: { name: "In Progress", complete: false },
  assigned_to_user: { id: "user-1", name: "Test User" },
  tags: [],
};

const mockResponse = {
  features: [mockFeature],
  team_locations: ["Prioritized backlog", "Team A"],
  total: 1,
};

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

describe("useProductFeatures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches product features when productId is provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useProductFeatures("prod-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/aha/products/prod-1/features?"
    );
    expect(result.current.data?.features).toEqual([mockFeature]);
    expect(result.current.data?.total).toBe(1);
  });

  it("returns team_locations from response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useProductFeatures("prod-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.team_locations).toEqual([
      "Prioritized backlog",
      "Team A",
    ]);
  });

  it("includes unestimated filter when requested", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [], team_locations: [], total: 0 }),
    });

    renderHook(
      () => useProductFeatures("prod-1", { unestimatedOnly: true }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/aha/products/prod-1/features?unestimated=true"
    );
  });

  it("does not include unestimated param when option is false", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    renderHook(
      () => useProductFeatures("prod-1", { unestimatedOnly: false }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/aha/products/prod-1/features?"
    );
  });

  it("does not fetch when productId is null", () => {
    renderHook(() => useProductFeatures(null), { wrapper: createWrapper() });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles fetch errors gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useProductFeatures("prod-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  it("uses separate query keys for estimated vs unestimated", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const wrapper = createWrapper();

    const { result: result1 } = renderHook(
      () => useProductFeatures("prod-1", { unestimatedOnly: true }),
      { wrapper }
    );
    const { result: result2 } = renderHook(
      () => useProductFeatures("prod-1", { unestimatedOnly: false }),
      { wrapper }
    );

    await waitFor(() => expect(result1.current.isSuccess).toBe(true));
    await waitFor(() => expect(result2.current.isSuccess).toBe(true));

    // Both queries should have been called (separate cache entries)
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
