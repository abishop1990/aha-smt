import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFeatures, useFeature, useUpdateFeatureScore, useUpdateFeatureEstimate } from "../use-features";
import type { AhaFeature } from "@/lib/aha-types";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock toast
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

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

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe("useFeatures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches features for a release", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [mockFeature], total: 1 }),
    });

    const { result } = renderHook(() => useFeatures("rel-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/aha/releases/rel-1/features?");
    expect(result.current.data?.features).toEqual([mockFeature]);
    expect(result.current.data?.total).toBe(1);
  });

  it("includes unestimated filter when requested", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [], total: 0 }),
    });

    renderHook(() => useFeatures("rel-1", { unestimatedOnly: true }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/aha/releases/rel-1/features?unestimated=true"
    );
  });

  it("does not fetch when releaseId is null", () => {
    renderHook(() => useFeatures(null), { wrapper: createWrapper() });

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles fetch errors gracefully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useFeatures("rel-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});

describe("useFeature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches a single feature by ID", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockFeature,
    });

    const { result } = renderHook(() => useFeature("feat-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/aha/features/feat-1");
    expect(result.current.data).toEqual(mockFeature);
  });

  it("does not fetch when featureId is null", () => {
    renderHook(() => useFeature(null), { wrapper: createWrapper() });

    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe("useUpdateFeatureScore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates feature score optimistically", async () => {
    // First, populate the cache with feature list
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [mockFeature], total: 1 }),
    });

    const wrapper = createWrapper();
    const { result: featuresResult } = renderHook(() => useFeatures("rel-1"), { wrapper });

    await waitFor(() => expect(featuresResult.current.isSuccess).toBe(true));

    // Now test the mutation
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockFeature, score: 8, work_units: 8 }),
    });

    const { result: mutationResult } = renderHook(() => useUpdateFeatureScore(), { wrapper });

    mutationResult.current.mutate({ featureId: "feat-1", score: 8 });

    // Optimistic update should happen immediately
    await waitFor(() => {
      const features = featuresResult.current.data?.features ?? [];
      const updated = features.find((f) => f.id === "feat-1");
      expect(updated?.score).toBe(8);
      expect(updated?.work_units).toBe(8);
    });
  });

  it("rolls back on error", async () => {
    // Setup initial cache
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [mockFeature], total: 1 }),
    });

    const wrapper = createWrapper();
    const { result: featuresResult } = renderHook(() => useFeatures("rel-1"), { wrapper });

    await waitFor(() => expect(featuresResult.current.isSuccess).toBe(true));

    // Mutation fails
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result: mutationResult } = renderHook(() => useUpdateFeatureScore(), { wrapper });

    mutationResult.current.mutate({ featureId: "feat-1", score: 8 });

    // Should roll back to original value
    await waitFor(() => {
      expect(mutationResult.current.isError).toBe(true);
    });

    const features = featuresResult.current.data?.features ?? [];
    const rolledBack = features.find((f) => f.id === "feat-1");
    expect(rolledBack?.score).toBe(5); // Original value
  });

  it("invalidates queries after successful update", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [mockFeature], total: 1 }),
    });

    const wrapper = createWrapper();
    renderHook(() => useFeatures("rel-1"), { wrapper });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockFeature, score: 8 }),
    });

    const { result: mutationResult } = renderHook(() => useUpdateFeatureScore(), { wrapper });

    mutationResult.current.mutate({ featureId: "feat-1", score: 8 });

    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));

    // Should have triggered refetch after mutation
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  });
});

describe("useUpdateFeatureEstimate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates feature estimate with specified field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ features: [mockFeature], total: 1 }),
    });

    const wrapper = createWrapper();
    renderHook(() => useFeatures("rel-1"), { wrapper });

    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockFeature, original_estimate: 13 }),
    });

    const { result: mutationResult } = renderHook(() => useUpdateFeatureEstimate(), { wrapper });

    mutationResult.current.mutate({
      featureId: "feat-1",
      points: 13,
      field: "original_estimate",
    });

    await waitFor(() => expect(mutationResult.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/aha/features/feat-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ original_estimate: 13 }),
    });
  });

  it("updates all feature list query caches", async () => {
    // Setup both features and iteration-features caches
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [mockFeature], total: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ features: [mockFeature], total: 1 }),
      });

    const wrapper = createWrapper();
    const { result: featuresResult } = renderHook(() => useFeatures("rel-1"), { wrapper });

    await waitFor(() => expect(featuresResult.current.isSuccess).toBe(true));

    // Now update
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockFeature, work_units: 21 }),
    });

    const { result: mutationResult } = renderHook(() => useUpdateFeatureEstimate(), { wrapper });

    mutationResult.current.mutate({
      featureId: "feat-1",
      points: 21,
      field: "work_units",
    });

    await waitFor(() => {
      const features = featuresResult.current.data?.features ?? [];
      const updated = features.find((f) => f.id === "feat-1");
      expect(updated?.work_units).toBe(21);
    });
  });
});
