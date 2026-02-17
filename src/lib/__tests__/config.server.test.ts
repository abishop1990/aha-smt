import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadConfigFromDb, invalidateServerConfig } from "../config.server";
import { __resetEnv } from "../env";

// Mock database module
vi.mock("@/lib/db", () => ({
  getDb: vi.fn(() => ({
    select: () => ({
      from: vi.fn().mockResolvedValue([]),
    }),
  })),
}));

// Mock database schema
vi.mock("@/lib/db/schema", () => ({
  orgConfig: {},
}));

// Mock environment variables - factory pattern allows different values per test
vi.mock("@/lib/env", () => ({
  getEnv: vi.fn(() => ({
    AHA_DOMAIN: "https://test.aha.io",
    AHA_API_TOKEN: "test-token",
  })),
  __resetEnv: vi.fn(() => {
    // Reset function for test isolation
  }),
}));

import { getEnv } from "../env";
import { DEFAULT_CONFIG } from "../config";

describe("loadConfigFromDb env var parsing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateServerConfig();
    __resetEnv();
  });

  it("uses BACKLOG_FILTER_TYPE from env", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      BACKLOG_FILTER_TYPE: "team_location",
      BACKLOG_TEAM_PRODUCT_ID: "123",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.backlog.filterType).toBe("team_location");
    expect(config.backlog.teamProductId).toBe("123");
  });

  it("parses POINTS_SCALE as array of numbers", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      POINTS_SCALE: "1,3,5,8,13",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.points.scale).toEqual([1, 3, 5, 8, 13]);
  });

  it("parses POINTS_SCALE with whitespace", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      POINTS_SCALE: " 1 , 2 , 3 , 5 , 8 ",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.points.scale).toEqual([1, 2, 3, 5, 8]);
  });

  it("parses POINTS_SCALE with decimal values", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      POINTS_SCALE: "0.1,0.5,1,2,3,5,8",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.points.scale).toEqual([0.1, 0.5, 1, 2, 3, 5, 8]);
  });

  it("parses BACKLOG_EXCLUDE_WORKFLOW_KINDS with whitespace", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      BACKLOG_EXCLUDE_WORKFLOW_KINDS: "Bug, Test, Chore",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.backlog.excludeWorkflowKinds).toEqual(["Bug", "Test", "Chore"]);
  });

  it("parses WORKFLOW_COMPLETE_MEANINGS", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      WORKFLOW_COMPLETE_MEANINGS: "DONE,SHIPPED,COMPLETE",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.workflow.completeMeanings).toEqual(["DONE", "SHIPPED", "COMPLETE"]);
  });

  it("parses WORKFLOW_COMPLETE_MEANINGS with whitespace", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      WORKFLOW_COMPLETE_MEANINGS: " DONE , SHIPPED , COMPLETE ",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.workflow.completeMeanings).toEqual(["DONE", "SHIPPED", "COMPLETE"]);
  });

  it("parses ESTIMATION_MATRIX as JSON", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      ESTIMATION_MATRIX: '{"L-L-L":1,"M-M-M":8,"H-H-H":21}',
    } as any);

    const config = await loadConfigFromDb();

    expect(config.estimation.matrix["L-L-L"]).toBe(1);
    expect(config.estimation.matrix["M-M-M"]).toBe(8);
    expect(config.estimation.matrix["H-H-H"]).toBe(21);
  });

  it("falls back to defaults when no env vars set", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.points.scale).toEqual(DEFAULT_CONFIG.points.scale);
    expect(config.points.source).toEqual(DEFAULT_CONFIG.points.source);
    expect(config.backlog.filterType).toBe("release");
    expect(config.sprints.mode).toBe("both");
    expect(config.workflow.completeMeanings).toEqual(DEFAULT_CONFIG.workflow.completeMeanings);
  });

  it("parses SPRINTS_MODE and SPRINTS_DEFAULT_VIEW", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      SPRINTS_MODE: "releases",
      SPRINTS_DEFAULT_VIEW: "releases",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.sprints.mode).toBe("releases");
    expect(config.sprints.defaultView).toBe("releases");
  });

  it("parses POINTS_SOURCE as array", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      POINTS_SOURCE: "score,work_units",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.points.source).toEqual(["score", "work_units"]);
  });

  it("parses POINTS_SOURCE with whitespace", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      POINTS_SOURCE: " original_estimate , score , work_units ",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.points.source).toEqual(["original_estimate", "score", "work_units"]);
  });

  it("parses POINTS_DEFAULT_PER_DAY", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      POINTS_DEFAULT_PER_DAY: 2,
    } as any);

    const config = await loadConfigFromDb();

    expect(config.points.defaultPerDay).toBe(2);
  });

  it("parses BACKLOG_CUSTOM_FIELD_KEY", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      BACKLOG_CUSTOM_FIELD_KEY: "custom_priority",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.backlog.customFieldKey).toBe("custom_priority");
  });

  it("sets default filterType when backlog env vars are set", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      BACKLOG_EXCLUDE_WORKFLOW_KINDS: "Bug",
    } as any);

    const config = await loadConfigFromDb();

    // When any backlog env var is set, filterType defaults to "release"
    expect(config.backlog.filterType).toBe("release");
    expect(config.backlog.excludeWorkflowKinds).toEqual(["Bug"]);
  });

  it("preserves default points config when POINTS_SOURCE is set", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      POINTS_SOURCE: "score",
    } as any);

    const config = await loadConfigFromDb();

    // When POINTS_SOURCE is set, other points defaults are preserved
    expect(config.points.source).toEqual(["score"]);
    expect(config.points.scale).toEqual(DEFAULT_CONFIG.points.scale);
    expect(config.points.defaultPerDay).toBe(DEFAULT_CONFIG.points.defaultPerDay);
  });

  it("preserves default sprints config when SPRINTS_MODE is set", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      SPRINTS_MODE: "iterations",
    } as any);

    const config = await loadConfigFromDb();

    // When SPRINTS_MODE is set, other sprints defaults are preserved
    expect(config.sprints.mode).toBe("iterations");
    expect(config.sprints.defaultView).toBe(DEFAULT_CONFIG.sprints.defaultView);
  });

  it("merges all env vars together", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      BACKLOG_FILTER_TYPE: "epic",
      BACKLOG_EXCLUDE_WORKFLOW_KINDS: "Bug, Test",
      POINTS_SCALE: "1,2,3,5,8",
      POINTS_DEFAULT_PER_DAY: 3,
      SPRINTS_MODE: "releases",
      WORKFLOW_COMPLETE_MEANINGS: "DONE,CLOSED",
      ESTIMATION_MATRIX: '{"L-L-L":2,"H-H-H":34}',
    } as any);

    const config = await loadConfigFromDb();

    expect(config.backlog.filterType).toBe("epic");
    expect(config.backlog.excludeWorkflowKinds).toEqual(["Bug", "Test"]);
    expect(config.points.scale).toEqual([1, 2, 3, 5, 8]);
    expect(config.points.defaultPerDay).toBe(3);
    expect(config.sprints.mode).toBe("releases");
    expect(config.workflow.completeMeanings).toEqual(["DONE", "CLOSED"]);
    expect(config.estimation.matrix["L-L-L"]).toBe(2);
    expect(config.estimation.matrix["H-H-H"]).toBe(34);
  });

  it("ignores invalid JSON in ESTIMATION_MATRIX", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      ESTIMATION_MATRIX: "not-valid-json",
    } as any);

    const config = await loadConfigFromDb();

    // Should fall back to defaults when JSON is invalid
    expect(config.estimation.matrix).toEqual(DEFAULT_CONFIG.estimation.matrix);
  });

  it("handles empty POINTS_SCALE gracefully", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      POINTS_SCALE: "invalid,not,numbers",
    } as any);

    const config = await loadConfigFromDb();

    // Invalid numbers should be filtered out, leaving an empty array
    expect(config.points.scale).toEqual([]);
  });

  it("handles partial numbers in POINTS_SCALE", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      POINTS_SCALE: "1,invalid,3,five,5",
    } as any);

    const config = await loadConfigFromDb();

    // Valid numbers should be parsed, invalid ones filtered
    expect(config.points.scale).toEqual([1, 3, 5]);
  });

  it("returns singleton on subsequent calls", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      BACKLOG_FILTER_TYPE: "tag",
    } as any);

    const config1 = await loadConfigFromDb();
    const config2 = await loadConfigFromDb();

    expect(config1).toBe(config2);
  });

  it("clears singleton when invalidateServerConfig is called", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      BACKLOG_FILTER_TYPE: "tag",
    } as any);

    const config1 = await loadConfigFromDb();
    invalidateServerConfig();
    const config2 = await loadConfigFromDb();

    expect(config1).not.toBe(config2);
    expect(config1).toEqual(config2);
  });

  it("handles empty BACKLOG_EXCLUDE_WORKFLOW_KINDS", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      BACKLOG_EXCLUDE_WORKFLOW_KINDS: " , , ",
    } as any);

    const config = await loadConfigFromDb();

    // Empty strings after split/trim should be filtered
    expect(config.backlog.excludeWorkflowKinds).toEqual([]);
  });

  it("handles multiple backlog env vars together", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      BACKLOG_FILTER_TYPE: "custom_field",
      BACKLOG_CUSTOM_FIELD_KEY: "priority",
      BACKLOG_EXCLUDE_WORKFLOW_KINDS: "Bug",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.backlog.filterType).toBe("custom_field");
    expect(config.backlog.customFieldKey).toBe("priority");
    expect(config.backlog.excludeWorkflowKinds).toEqual(["Bug"]);
  });

  it("parses BACKLOG_TAG_FILTER from env", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      BACKLOG_TAG_FILTER: "frontend",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.backlog.tagFilter).toBe("frontend");
  });

  it("parses BACKLOG_EPIC_ID from env", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockReturnValue({
      AHA_DOMAIN: "https://test.aha.io",
      AHA_API_TOKEN: "test-token",
      BACKLOG_EPIC_ID: "PRJ-E-1",
    } as any);

    const config = await loadConfigFromDb();

    expect(config.backlog.epicId).toBe("PRJ-E-1");
  });

  it("gracefully handles getEnv throwing", async () => {
    const mockGetEnv = vi.mocked(getEnv);
    mockGetEnv.mockImplementation(() => {
      throw new Error("Invalid env");
    });

    const config = await loadConfigFromDb();

    // Should return defaults when getEnv throws
    expect(config.points.scale).toEqual(DEFAULT_CONFIG.points.scale);
    expect(config.backlog.filterType).toBe("release");
  });
});
