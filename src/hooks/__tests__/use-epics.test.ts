import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useEpics } from "../use-epics";
import type { AhaEpic } from "@/lib/aha-types";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockEpic: AhaEpic = {
  id: "epic-1",
  reference_num: "PRJ-E-1",
  name: "Test Epic",
  start_date: "2026-01-01",
  due_date: "2026-03-31",
  workflow_status: { name: "In Progress", complete: false },
  progress: 40,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
};

describe("useEpics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches epics when productId is provided", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ epics: [mockEpic] }),
    });

    const { result } = renderHook(() => useEpics("prod-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/aha/products/prod-1/epics");
    expect(result.current.data?.epics).toEqual([mockEpic]);
  });

  it("does not fetch when productId is null", () => {
    renderHook(() => useEpics(null), { wrapper: createWrapper() });
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("handles fetch errors gracefully", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useEpics("prod-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  it("returns empty epics array when response has no epics key", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ epics: [] }),
    });

    const { result } = renderHook(() => useEpics("prod-1"), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.epics).toEqual([]);
  });
});
