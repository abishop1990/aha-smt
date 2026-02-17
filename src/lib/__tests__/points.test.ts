import { describe, it, expect, vi } from "vitest";
import { getPoints, isUnestimated, formatPoints } from "../points";
import type { AhaFeature } from "../aha-types";
import * as configModule from "../config";

function makeFeature(
  overrides: Partial<AhaFeature> = {}
): AhaFeature {
  return {
    id: "feat-1",
    reference_num: "FEAT-1",
    name: "Test Feature",
    position: 0,
    created_at: "2024-01-01",
    ...overrides,
  };
}

describe("getPoints", () => {
  it("returns original_estimate when set", () => {
    expect(getPoints(makeFeature({ original_estimate: 5, score: 3 }))).toBe(5);
  });

  it("falls back to score when original_estimate is null", () => {
    expect(getPoints(makeFeature({ original_estimate: null, score: 8 }))).toBe(8);
  });

  it("falls back to score when original_estimate is undefined", () => {
    expect(getPoints(makeFeature({ score: 3 }))).toBe(3);
  });

  it("returns 0 when both are null", () => {
    expect(getPoints(makeFeature({ original_estimate: null, score: null }))).toBe(0);
  });

  it("returns 0 when both are undefined", () => {
    expect(getPoints(makeFeature({}))).toBe(0);
  });

  it("returns 0 for original_estimate of 0", () => {
    expect(getPoints(makeFeature({ original_estimate: 0, score: 5 }))).toBe(0);
  });

  it("handles decimal values", () => {
    expect(getPoints(makeFeature({ original_estimate: 2.5 }))).toBe(2.5);
  });
});

describe("isUnestimated", () => {
  it("returns true when both are null", () => {
    expect(isUnestimated(makeFeature({ original_estimate: null, score: null }))).toBe(true);
  });

  it("returns true when both are undefined", () => {
    expect(isUnestimated(makeFeature({}))).toBe(true);
  });

  it("returns true when original_estimate is 0 and score is undefined", () => {
    expect(isUnestimated(makeFeature({ original_estimate: 0 }))).toBe(true);
  });

  it("returns true when score is 0 and original_estimate is null", () => {
    expect(isUnestimated(makeFeature({ score: 0, original_estimate: null }))).toBe(true);
  });

  it("returns false when original_estimate is set", () => {
    expect(isUnestimated(makeFeature({ original_estimate: 3 }))).toBe(false);
  });

  it("returns false when score is set and original_estimate is null", () => {
    expect(isUnestimated(makeFeature({ original_estimate: null, score: 5 }))).toBe(false);
  });

  it("returns false for original_estimate of 0.5", () => {
    expect(isUnestimated(makeFeature({ original_estimate: 0.5 }))).toBe(false);
  });
});

describe("getPoints with custom config", () => {
  function mockSource(source: configModule.PointField[]) {
    vi.spyOn(configModule, "getConfigSync").mockReturnValue({
      ...configModule.DEFAULT_CONFIG,
      points: { ...configModule.DEFAULT_CONFIG.points, source },
    });
  }

  it("uses score-first source order when configured", () => {
    mockSource(["score", "original_estimate"]);
    expect(getPoints(makeFeature({ score: 3, original_estimate: 5 }))).toBe(3);
  });

  it("uses single source when configured", () => {
    mockSource(["score"]);
    expect(getPoints(makeFeature({ score: null, original_estimate: 5 }))).toBe(0);
  });

  it("supports work_units as source", () => {
    mockSource(["work_units", "score"]);
    expect(getPoints(makeFeature({ work_units: 4, score: 3 }))).toBe(4);
  });
});

describe("formatPoints", () => {
  it("formats whole numbers without decimals", () => {
    expect(formatPoints(5)).toBe("5");
    expect(formatPoints(0)).toBe("0");
    expect(formatPoints(21)).toBe("21");
  });

  it("formats decimals with up to 2 places", () => {
    expect(formatPoints(2.5)).toBe("2.5");
    expect(formatPoints(1.25)).toBe("1.25");
  });

  it("rounds to 2 decimal places", () => {
    expect(formatPoints(3.333)).toBe("3.33");
    expect(formatPoints(1.999)).toBe("2");
  });

  it("strips trailing zeros", () => {
    expect(formatPoints(2.10)).toBe("2.1");
    expect(formatPoints(3.00)).toBe("3");
  });
});
