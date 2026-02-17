import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import {
  useStandups,
  useCreateStandup,
  useUpdateStandup,
} from "../use-standups";
import type { StandupEntry } from "../use-standups";

const mockFetch = vi.fn();
global.fetch = mockFetch;

const makeEntry = (overrides: Partial<StandupEntry> = {}): StandupEntry => ({
  id: 1,
  userId: "user-1",
  userName: "Alice",
  standupDate: "2026-01-15",
  doneSinceLastStandup: "Finished feature X",
  workingOnNow: "Working on feature Y",
  blockers: "None",
  actionItems: "Update tickets",
  featureRefs: "FEAT-1,FEAT-2",
  createdAt: "2026-01-15T09:00:00.000Z",
  updatedAt: "2026-01-15T09:00:00.000Z",
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
// useStandups
// ---------------------------------------------------------------------------
describe("useStandups", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClient();
  });

  it("fetches with no params (URL ends with /api/standups?)", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [] }),
    });

    const { result } = renderHook(() => useStandups(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockFetch).toHaveBeenCalledWith("/api/standups?");
  });

  it("fetches with date param — URL includes date=2026-01-15", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [] }),
    });

    const { result } = renderHook(() => useStandups("2026-01-15"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("date=2026-01-15");
  });

  it("fetches with userId param — URL includes userId=user-1", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [] }),
    });

    const { result } = renderHook(() => useStandups(undefined, "user-1"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("userId=user-1");
  });

  it("fetches with both date and userId params", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [] }),
    });

    const { result } = renderHook(() => useStandups("2026-01-15", "user-1"), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const url = mockFetch.mock.calls[0][0] as string;
    expect(url).toContain("date=2026-01-15");
    expect(url).toContain("userId=user-1");
  });

  it("returns entries array from response", async () => {
    const entry = makeEntry();
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ entries: [entry] }),
    });

    const { result } = renderHook(() => useStandups(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.entries).toEqual([entry]);
  });

  it("throws on non-ok response (isError = true)", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

    const { result } = renderHook(() => useStandups(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// useCreateStandup
// ---------------------------------------------------------------------------
describe("useCreateStandup", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClient();
  });

  const newStandupPayload = {
    userId: "user-1",
    userName: "Alice",
    standupDate: "2026-01-15",
    doneSinceLastStandup: "Finished feature X",
    workingOnNow: "Working on feature Y",
    blockers: "None",
    actionItems: "Update tickets",
    featureRefs: ["FEAT-1", "FEAT-2"],
  };

  it("calls POST /api/standups with JSON body", async () => {
    const created = makeEntry({ id: 99 });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => created,
    });

    const { result } = renderHook(() => useCreateStandup(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(newStandupPayload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/standups",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStandupPayload),
      })
    );
  });

  it("includes featureRefs as array in request body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeEntry(),
    });

    const { result } = renderHook(() => useCreateStandup(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(newStandupPayload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(Array.isArray(body.featureRefs)).toBe(true);
    expect(body.featureRefs).toEqual(["FEAT-1", "FEAT-2"]);
  });

  it("optimistically prepends new entry to existing entries list", async () => {
    const existingEntry = makeEntry({ id: 1 });

    // First call: useStandups initial fetch
    // Second call: POST — deferred so we can inspect optimistic state
    let resolvePost!: (value: unknown) => void;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [existingEntry] }),
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePost = resolve;
        })
      );

    const { result } = renderHook(
      () => ({ query: useStandups(), mutation: useCreateStandup() }),
      { wrapper: createWrapper(queryClient) }
    );

    // Wait for the initial query to load
    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
    expect(result.current.query.data?.entries).toHaveLength(1);

    // Fire mutation — don't await so the POST stays pending
    act(() => {
      result.current.mutation.mutate(newStandupPayload);
    });

    // Wait for optimistic state: 2 entries with new one prepended
    await waitFor(() => {
      expect(result.current.query.data?.entries).toHaveLength(2);
    });

    const entries = result.current.query.data!.entries;
    expect(entries[0].userId).toBe("user-1");
    expect(entries[1]).toEqual(existingEntry);

    // Resolve so the test finishes cleanly
    resolvePost({ ok: true, json: async () => makeEntry({ id: 99 }) });
  });

  it("rolls back optimistic update on error", async () => {
    const existingEntry = makeEntry({ id: 1 });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [existingEntry] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [existingEntry] }),
      });

    const { result } = renderHook(
      () => ({ query: useStandups(), mutation: useCreateStandup() }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    await act(async () => {
      result.current.mutation.mutate(newStandupPayload);
    });

    await waitFor(() => expect(result.current.mutation.isError).toBe(true));

    // After rollback + refetch, the original entry should be present
    await waitFor(() => {
      const entries = result.current.query.data?.entries;
      expect(entries).toBeDefined();
      expect(entries!.some((e) => e.id === 1)).toBe(true);
    });
  });

  it("invalidates standups query on settled (success)", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeEntry() })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ entries: [] }) });

    const { result } = renderHook(() => useCreateStandup(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(newStandupPayload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["standups"] })
    );
  });

  it("invalidates standups query on error + settled", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ entries: [] }) });

    const { result } = renderHook(() => useCreateStandup(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(newStandupPayload);
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["standups"] })
    );
  });
});

// ---------------------------------------------------------------------------
// useUpdateStandup
// ---------------------------------------------------------------------------
describe("useUpdateStandup", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClient();
  });

  const updatePayload = {
    id: 1,
    doneSinceLastStandup: "Updated done",
    workingOnNow: "Updated working on",
    blockers: "New blocker",
    actionItems: "New action item",
    featureRefs: ["FEAT-3"],
  };

  it("calls PUT /api/standups/:id with correct JSON body", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => makeEntry(),
    });

    const { result } = renderHook(() => useUpdateStandup(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(updatePayload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/standups/1",
      expect.objectContaining({
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      })
    );

    const { id: _id, ...bodyWithoutId } = updatePayload;
    const sentBody = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(sentBody).toEqual(bodyWithoutId);
  });

  it("optimistically updates matching entry by id in cache", async () => {
    const existingEntry = makeEntry({ id: 1 });
    const otherEntry = makeEntry({ id: 2, userId: "user-2" });

    let resolvePut!: (value: unknown) => void;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [existingEntry, otherEntry] }),
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePut = resolve;
        })
      );

    const { result } = renderHook(
      () => ({ query: useStandups(), mutation: useUpdateStandup() }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    act(() => {
      result.current.mutation.mutate(updatePayload);
    });

    // Wait for optimistic update to appear
    await waitFor(() => {
      const updated = result.current.query.data?.entries.find((e) => e.id === 1);
      expect(updated?.doneSinceLastStandup).toBe("Updated done");
    });

    const entries = result.current.query.data!.entries;
    expect(entries).toHaveLength(2);
    expect(entries.find((e) => e.id === 1)?.workingOnNow).toBe("Updated working on");
    // Other entry should be untouched
    expect(entries.find((e) => e.id === 2)).toEqual(otherEntry);

    resolvePut({ ok: true, json: async () => makeEntry() });
  });

  it("preserves existing featureRefs if none provided in update", async () => {
    const existingEntry = makeEntry({ id: 1, featureRefs: "FEAT-1,FEAT-2" });

    let resolvePut!: (value: unknown) => void;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [existingEntry] }),
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePut = resolve;
        })
      );

    const { result } = renderHook(
      () => ({ query: useStandups(), mutation: useUpdateStandup() }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    const payloadWithoutRefs = {
      id: 1,
      doneSinceLastStandup: "Updated done",
      workingOnNow: "Updated working on",
      blockers: "None",
      actionItems: "None",
    };

    act(() => {
      result.current.mutation.mutate(payloadWithoutRefs);
    });

    // Wait for the optimistic update to reflect the changed fields
    await waitFor(() => {
      const entry = result.current.query.data?.entries.find((e) => e.id === 1);
      expect(entry?.doneSinceLastStandup).toBe("Updated done");
    });

    const updated = result.current.query.data?.entries.find((e) => e.id === 1);
    // featureRefs should be preserved from the original since none were supplied
    expect(updated?.featureRefs).toBe("FEAT-1,FEAT-2");

    resolvePut({ ok: true, json: async () => makeEntry() });
  });

  it("converts featureRefs array to JSON string in optimistic update", async () => {
    const existingEntry = makeEntry({ id: 1, featureRefs: "" });

    let resolvePut!: (value: unknown) => void;
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [existingEntry] }),
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolvePut = resolve;
        })
      );

    const { result } = renderHook(
      () => ({ query: useStandups(), mutation: useUpdateStandup() }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    act(() => {
      result.current.mutation.mutate({ ...updatePayload, featureRefs: ["FEAT-3", "FEAT-4"] });
    });

    // Wait for the optimistic featureRefs to appear as a JSON string
    await waitFor(() => {
      const entry = result.current.query.data?.entries.find((e) => e.id === 1);
      expect(entry?.featureRefs).toBe(JSON.stringify(["FEAT-3", "FEAT-4"]));
    });

    resolvePut({ ok: true, json: async () => makeEntry() });
  });

  it("rolls back optimistic update on error", async () => {
    const existingEntry = makeEntry({ id: 1 });

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [existingEntry] }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ entries: [existingEntry] }),
      });

    const { result } = renderHook(
      () => ({ query: useStandups(), mutation: useUpdateStandup() }),
      { wrapper: createWrapper(queryClient) }
    );

    await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

    await act(async () => {
      result.current.mutation.mutate(updatePayload);
    });

    await waitFor(() => expect(result.current.mutation.isError).toBe(true));

    // After rollback + refetch, the original entry should be present
    await waitFor(() => {
      const entries = result.current.query.data?.entries;
      expect(entries).toBeDefined();
      expect(entries!.some((e) => e.id === 1)).toBe(true);
    });
  });

  it("invalidates standups query on settled", async () => {
    const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => makeEntry() })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ entries: [] }) });

    const { result } = renderHook(() => useUpdateStandup(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      result.current.mutate(updatePayload);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["standups"] })
    );
  });
});
