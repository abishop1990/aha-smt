import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import {
  useDaysOff,
  useCreateDayOff,
  useDeleteDayOff,
} from "../use-schedules";
import type { DayOff } from "../use-schedules";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const makeDayOff = (overrides: Partial<DayOff> = {}): DayOff => ({
  id: 1,
  userId: "user-1",
  userName: "Alice",
  date: "2026-02-17",
  reason: "Vacation",
  isHoliday: false,
  createdAt: "2026-02-17T09:00:00.000Z",
  ...overrides,
});

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  Wrapper.displayName = "TestWrapper";
  return Wrapper;
};

// ---------------------------------------------------------------------------
// useDaysOff
// ---------------------------------------------------------------------------
describe("useDaysOff", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClient();
  });

  it("fetches with no params (URL ends with /api/days-off?)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ daysOff: [] }),
    });

    const { result } = renderHook(() => useDaysOff(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/days-off?");
  });

  it("fetches with userId param — URL includes userId=user-1", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ daysOff: [] }),
    });

    const { result } = renderHook(() => useDaysOff({ userId: "user-1" }), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("userId=user-1");
  });

  it("fetches with startDate param — URL includes startDate=2026-02-01", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ daysOff: [] }),
    });

    const { result } = renderHook(
      () => useDaysOff({ startDate: "2026-02-01" }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("startDate=2026-02-01");
  });

  it("fetches with endDate param — URL includes endDate=2026-02-28", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ daysOff: [] }),
    });

    const { result } = renderHook(
      () => useDaysOff({ endDate: "2026-02-28" }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("endDate=2026-02-28");
  });

  it("fetches with full date range and userId — all params present in URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ daysOff: [] }),
    });

    const { result } = renderHook(
      () =>
        useDaysOff({
          userId: "user-1",
          startDate: "2026-02-01",
          endDate: "2026-02-28",
        }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("userId=user-1");
    expect(url).toContain("startDate=2026-02-01");
    expect(url).toContain("endDate=2026-02-28");
  });

  it("returns daysOff array from response", async () => {
    const dayOff = makeDayOff();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ daysOff: [dayOff] }),
    });

    const { result } = renderHook(() => useDaysOff(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.daysOff).toEqual([dayOff]);
  });

  it("throws on non-ok response (isError = true)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useDaysOff(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// useCreateDayOff
// ---------------------------------------------------------------------------
describe("useCreateDayOff", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClient();
  });

  const newDayOffPayload = {
    userId: "user-1",
    userName: "Alice",
    date: "2026-02-17",
    reason: "Vacation",
    isHoliday: false,
  };

  it("calls POST /api/days-off with JSON body", async () => {
    const created = makeDayOff({ id: 99 });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => created,
    });

    const { result } = renderHook(() => useCreateDayOff(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(newDayOffPayload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/days-off",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newDayOffPayload),
      })
    );
  });

  it("calls POST /api/days-off with only required date field", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeDayOff({ userId: null, userName: null, reason: "" }),
    });

    const { result } = renderHook(() => useCreateDayOff(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ date: "2026-02-17" });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/days-off",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ date: "2026-02-17" }),
      })
    );
  });

  it("optimistically appends new day off to existing list", async () => {
    const existingDayOff = makeDayOff({ id: 1 });

    let resolvePost!: (value: unknown) => void;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ daysOff: [existingDayOff] }),
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePost = resolve;
        })
      );

    const { result } = renderHook(
      () => ({ query: useDaysOff(), mutation: useCreateDayOff() }),
      { wrapper: createWrapper(queryClient) }
    );

    // Wait for the initial query to load
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data?.daysOff).toHaveLength(1);

    // Fire mutation — don't await so the POST stays pending
    act(() => {
      result.current.mutation.mutate(newDayOffPayload);
    });

    // Wait for optimistic state: 2 items with new one appended
    await waitFor(() => {
      expect(result.current.query.data?.daysOff).toHaveLength(2);
    });

    const items = result.current.query.data!.daysOff;
    // The original entry is still present
    expect(items[0]).toEqual(existingDayOff);
    // The optimistic entry is appended at the end
    expect(items[1].userId).toBe("user-1");
    expect(items[1].date).toBe("2026-02-17");

    // Resolve so the test finishes cleanly
    resolvePost({ ok: true, json: async () => makeDayOff({ id: 99 }) });
  });

  it("rolls back optimistic update on error", async () => {
    const existingDayOff = makeDayOff({ id: 1 });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ daysOff: [existingDayOff] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ daysOff: [existingDayOff] }),
      });

    const { result } = renderHook(
      () => ({ query: useDaysOff(), mutation: useCreateDayOff() }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    await act(async () => {
      result.current.mutation.mutate(newDayOffPayload);
    });

    await waitFor(() => expect(result.current.mutation.isError).toBe(true));

    // After rollback + refetch, the original entry should be present
    await waitFor(() => {
      const items = result.current.query.data?.daysOff;
      expect(items).toBeDefined();
      expect(items!.some((d) => d.id === 1)).toBe(true);
    });
  });

  it("invalidates days-off query on settled (success)", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeDayOff() })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ daysOff: [] }) });

    const { result } = renderHook(() => useCreateDayOff(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(newDayOffPayload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["days-off"] })
    );
  });

  it("invalidates days-off query on error + settled", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ daysOff: [] }) });

    const { result } = renderHook(() => useCreateDayOff(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(newDayOffPayload);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["days-off"] })
    );
  });

  it("sets isHoliday=true when provided in payload", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeDayOff({ isHoliday: true, userId: null, userName: null }),
    });

    const { result } = renderHook(() => useCreateDayOff(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate({ date: "2026-12-25", isHoliday: true });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.isHoliday).toBe(true);
    expect(body.date).toBe("2026-12-25");
  });
});

// ---------------------------------------------------------------------------
// useDeleteDayOff
// ---------------------------------------------------------------------------
describe("useDeleteDayOff", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClient();
  });

  it("calls DELETE /api/days-off/:id", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useDeleteDayOff(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(42);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/days-off/42", {
      method: "DELETE",
    });
  });

  it("optimistically removes the deleted day off from the list", async () => {
    const dayOff1 = makeDayOff({ id: 1 });
    const dayOff2 = makeDayOff({ id: 2, date: "2026-03-01" });

    let resolveDelete!: (value: unknown) => void;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ daysOff: [dayOff1, dayOff2] }),
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveDelete = resolve;
        })
      );

    const { result } = renderHook(
      () => ({ query: useDaysOff(), mutation: useDeleteDayOff() }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data?.daysOff).toHaveLength(2);

    // Fire delete — don't await so the DELETE stays pending
    act(() => {
      result.current.mutation.mutate(1);
    });

    // Wait for optimistic state: item with id=1 removed
    await waitFor(() => {
      expect(result.current.query.data?.daysOff).toHaveLength(1);
    });

    const remaining = result.current.query.data!.daysOff;
    expect(remaining[0]).toEqual(dayOff2);
    expect(remaining.some((d) => d.id === 1)).toBe(false);

    // Resolve so the test finishes cleanly
    resolveDelete({ ok: true, json: async () => ({ success: true }) });
  });

  it("rolls back optimistic removal on error", async () => {
    const dayOff1 = makeDayOff({ id: 1 });
    const dayOff2 = makeDayOff({ id: 2, date: "2026-03-01" });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ daysOff: [dayOff1, dayOff2] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ daysOff: [dayOff1, dayOff2] }),
      });

    const { result } = renderHook(
      () => ({ query: useDaysOff(), mutation: useDeleteDayOff() }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    await act(async () => {
      result.current.mutation.mutate(1);
    });

    await waitFor(() => expect(result.current.mutation.isError).toBe(true));

    // After rollback + refetch, both entries should be restored
    await waitFor(() => {
      const items = result.current.query.data?.daysOff;
      expect(items).toBeDefined();
      expect(items!.some((d) => d.id === 1)).toBe(true);
    });
  });

  it("invalidates days-off query on settled (success)", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ daysOff: [] }) });

    const { result } = renderHook(() => useDeleteDayOff(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(1);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["days-off"] })
    );
  });

  it("invalidates days-off query on error + settled", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ daysOff: [] }) });

    const { result } = renderHook(() => useDeleteDayOff(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(999);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["days-off"] })
    );
  });

  it("throws on non-ok DELETE response (isError = true)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 404 });

    const { result } = renderHook(() => useDeleteDayOff(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(999);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});
