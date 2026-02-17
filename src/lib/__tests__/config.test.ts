import { describe, it, expect, beforeEach } from "vitest";
import { getConfig, defineConfig, DEFAULT_CONFIG, __resetConfig } from "../config";

beforeEach(() => {
  __resetConfig();
});

describe("config", () => {
  describe("getConfig", () => {
    it("returns full defaults", () => {
      const config = getConfig();
      expect(config.points.source).toEqual(["original_estimate", "score"]);
      expect(config.points.scale).toEqual([1, 2, 3, 5, 8, 13, 21]);
      expect(config.points.defaultPerDay).toBe(1);
      expect(config.sprints.mode).toBe("both");
      expect(config.sprints.defaultView).toBe("iterations");
      expect(config.workflow.completeMeanings).toEqual(["DONE", "SHIPPED"]);
      expect(config.estimation.matrix["S-S-S"]).toBe(1);
      expect(config.estimation.matrix["L-L-L"]).toBe(21);
    });

    it("returns singleton on subsequent calls", () => {
      const a = getConfig();
      const b = getConfig();
      expect(a).toBe(b);
    });
  });

  describe("defineConfig", () => {
    it("returns the input unchanged", () => {
      const input = { points: { source: ["score" as const] } };
      expect(defineConfig(input)).toBe(input);
    });

    it("accepts a full config", () => {
      const result = defineConfig({
        points: {
          source: ["score"],
          scale: [1, 2, 4, 8],
          defaultPerDay: 2,
        },
        sprints: { mode: "releases", defaultView: "releases" },
        workflow: { completeMeanings: ["DONE"] },
        estimation: { matrix: { "L-L-L": 1 } },
      });
      expect(result.points?.source).toEqual(["score"]);
    });

    it("accepts a partial config", () => {
      const result = defineConfig({ points: { scale: [1, 2, 3] } });
      expect(result.points?.scale).toEqual([1, 2, 3]);
    });
  });

  describe("DEFAULT_CONFIG", () => {
    it("has all 64 estimation matrix entries", () => {
      expect(Object.keys(DEFAULT_CONFIG.estimation.matrix)).toHaveLength(64);
    });

    it("has 7 point scale values", () => {
      expect(DEFAULT_CONFIG.points.scale).toHaveLength(7);
    });
  });

  describe("__resetConfig", () => {
    it("clears the singleton so getConfig returns a fresh instance", () => {
      const a = getConfig();
      __resetConfig();
      const b = getConfig();
      expect(a).not.toBe(b);
      expect(a).toEqual(b);
    });
  });
});
