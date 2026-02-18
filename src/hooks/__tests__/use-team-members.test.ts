import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement } from "react";
import { useTeamMembers } from "../use-team-members";

const mockFetch = vi.fn();
global.fetch = mockFetch;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type TeamMemberStub = { id: string; name: string };
type TeamStub = { id: string; name: string; team_members?: { user: TeamMemberStub }[] };
type UserStub = { id: string; name: string; email: string };

const makeTeam = (
  id: string,
  members: TeamMemberStub[] = []
): TeamStub => ({
  id,
  name: `Team ${id}`,
  team_members: members.map((u) => ({ user: u })),
});

const makeUser = (overrides: Partial<UserStub> = {}): UserStub => ({
  id: "user-1",
  name: "Alice",
  email: "alice@example.com",
  ...overrides,
});

// Build a resolved fetch response for the given body.
const okJson = (body: unknown) => ({
  ok: true,
  json: async () => body,
});

// Build a failed fetch response.
const notOk = (status = 500) => ({ ok: false, status });

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
// Tests
// ---------------------------------------------------------------------------

describe("useTeamMembers", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createQueryClient();
  });

  // ---- teams path --------------------------------------------------------

  it("returns members from teams when teams data is non-empty", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okJson({
          teams: [
            makeTeam("t1", [
              { id: "u1", name: "Alice" },
              { id: "u2", name: "Bob" },
            ]),
          ],
        })
      )
      // useUsers runs concurrently — it can succeed or fail; result shouldn't matter here
      .mockResolvedValueOnce(okJson({ users: [] }));

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([
      { id: "u1", name: "Alice" },
      { id: "u2", name: "Bob" },
    ]);
  });

  it("aggregates members across multiple teams", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okJson({
          teams: [
            makeTeam("t1", [{ id: "u1", name: "Alice" }]),
            makeTeam("t2", [
              { id: "u2", name: "Bob" },
              { id: "u3", name: "Carol" },
            ]),
          ],
        })
      )
      .mockResolvedValueOnce(okJson({ users: [] }));

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(3);
    expect(result.current.data.map((m) => m.id)).toEqual(["u1", "u2", "u3"]);
  });

  it("deduplicates members who appear in multiple teams, keeping first occurrence", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okJson({
          teams: [
            makeTeam("t1", [{ id: "u1", name: "Alice" }]),
            makeTeam("t2", [
              { id: "u1", name: "Alice-duplicate" }, // same id, different name
              { id: "u2", name: "Bob" },
            ]),
          ],
        })
      )
      .mockResolvedValueOnce(okJson({ users: [] }));

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Only two unique members; first occurrence of u1 wins
    expect(result.current.data).toHaveLength(2);
    const u1 = result.current.data.find((m) => m.id === "u1");
    expect(u1?.name).toBe("Alice");
  });

  it("preserves insertion order across teams after deduplication", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okJson({
          teams: [
            makeTeam("t1", [
              { id: "u2", name: "Bob" },
              { id: "u1", name: "Alice" },
            ]),
            makeTeam("t2", [{ id: "u3", name: "Carol" }]),
          ],
        })
      )
      .mockResolvedValueOnce(okJson({ users: [] }));

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data.map((m) => m.id)).toEqual(["u2", "u1", "u3"]);
  });

  it("handles teams with undefined team_members (null-coalesces to empty)", async () => {
    // team_members is absent — AhaTeam has it as optional
    mockFetch
      .mockResolvedValueOnce(
        okJson({
          teams: [{ id: "t1", name: "Team 1" }], // no team_members key
        })
      )
      .mockResolvedValueOnce(
        okJson({
          users: [makeUser({ id: "u9", name: "Fallback User" })],
        })
      );

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Team had no members → falls back to users
    expect(result.current.data).toEqual([{ id: "u9", name: "Fallback User" }]);
  });

  it("handles teams with an explicit empty team_members array — falls back to users", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okJson({
          teams: [makeTeam("t1", [])], // empty array
        })
      )
      .mockResolvedValueOnce(
        okJson({
          users: [makeUser({ id: "u9", name: "Fallback User" })],
        })
      );

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([{ id: "u9", name: "Fallback User" }]);
  });

  it("falls back to users when teams array is empty", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ teams: [] }))
      .mockResolvedValueOnce(
        okJson({
          users: [
            makeUser({ id: "u1", name: "Alice" }),
            makeUser({ id: "u2", name: "Bob", email: "bob@example.com" }),
          ],
        })
      );

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([
      { id: "u1", name: "Alice" },
      { id: "u2", name: "Bob" },
    ]);
  });

  // ---- users path --------------------------------------------------------

  it("filters out users without a name when using the users fallback", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ teams: [] }))
      .mockResolvedValueOnce(
        okJson({
          users: [
            makeUser({ id: "u1", name: "Alice" }),
            { id: "u2", name: "", email: "noname@example.com" }, // empty name
            { id: "u3", name: null, email: "null@example.com" }, // null name
          ],
        })
      );

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Only Alice survives the filter
    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0]).toEqual({ id: "u1", name: "Alice" });
  });

  // ---- empty / null state ------------------------------------------------

  it("returns empty array when both teams and users have no data", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ teams: [] }))
      .mockResolvedValueOnce(okJson({ users: [] }));

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
  });

  it("returns empty array when teams data is undefined and users data is undefined", async () => {
    // Both queries fail — data will be undefined on both
    mockFetch
      .mockResolvedValueOnce(notOk(500))
      .mockResolvedValueOnce(notOk(500));

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toEqual([]);
  });

  // ---- isLoading ---------------------------------------------------------

  it("isLoading is true while either query is pending", async () => {
    let resolveTeams!: (v: unknown) => void;
    let resolveUsers!: (v: unknown) => void;

    mockFetch
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveTeams = resolve;
        })
      )
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveUsers = resolve;
        })
      );

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    // Both still loading
    expect(result.current.isLoading).toBe(true);

    // Resolve teams; users still pending
    resolveTeams({ ok: true, json: async () => ({ teams: [] }) });
    await waitFor(() => expect(result.current.isLoading).toBe(true));

    // Resolve users; both done
    resolveUsers({ ok: true, json: async () => ({ users: [] }) });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  it("isLoading is false once both queries settle (even on error)", async () => {
    mockFetch
      .mockResolvedValueOnce(notOk(500))
      .mockResolvedValueOnce(notOk(404));

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });

  // ---- error forwarding --------------------------------------------------

  it("error is null when only teams query errors (users succeeds)", async () => {
    mockFetch
      .mockResolvedValueOnce(notOk(500)) // teams fails
      .mockResolvedValueOnce(okJson({ users: [makeUser()] })); // users succeeds

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
  });

  it("error is null when only users query errors (teams succeeds)", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okJson({ teams: [makeTeam("t1", [{ id: "u1", name: "Alice" }])] })
      )
      .mockResolvedValueOnce(notOk(500)); // users fails

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
  });

  it("error is users.error when both queries error", async () => {
    mockFetch
      .mockResolvedValueOnce(notOk(500)) // teams fails
      .mockResolvedValueOnce(notOk(503)); // users fails

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // When both error, error === users.error (truthy)
    expect(result.current.error).toBeTruthy();
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toBe("Failed to fetch users");
  });

  it("error is null when both queries succeed", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ teams: [] }))
      .mockResolvedValueOnce(okJson({ users: [] }));

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
  });

  // ---- teams path takes priority over users ------------------------------

  it("uses teams data and ignores users when teams has members", async () => {
    mockFetch
      .mockResolvedValueOnce(
        okJson({
          teams: [makeTeam("t1", [{ id: "team-user", name: "Team Member" }])],
        })
      )
      .mockResolvedValueOnce(
        okJson({
          users: [makeUser({ id: "product-user", name: "Product User" })],
        })
      );

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toHaveLength(1);
    expect(result.current.data[0].id).toBe("team-user");
    // product-user must not appear
    expect(result.current.data.some((m) => m.id === "product-user")).toBe(false);
  });

  // ---- fetch calls -------------------------------------------------------

  it("fetches from /api/aha/teams", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ teams: [] }))
      .mockResolvedValueOnce(okJson({ users: [] }));

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const urls = mockFetch.mock.calls.map((call) => call[0] as string);
    expect(urls).toContain("/api/aha/teams");
  });

  it("fetches from /api/aha/users", async () => {
    mockFetch
      .mockResolvedValueOnce(okJson({ teams: [] }))
      .mockResolvedValueOnce(okJson({ users: [] }));

    const { result } = renderHook(() => useTeamMembers(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const urls = mockFetch.mock.calls.map((call) => call[0] as string);
    expect(urls).toContain("/api/aha/users");
  });
});
