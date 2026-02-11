import { bench, describe } from "vitest";
import { getPoints, isUnestimated, formatPoints } from "@/lib/points";
import type { AhaFeature } from "@/lib/aha-types";

function makeFeature(overrides: Partial<AhaFeature> = {}): AhaFeature {
  return {
    id: "feat-1",
    reference_num: "FEAT-1",
    name: "Test Feature",
    position: 0,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

const features: AhaFeature[] = Array.from({ length: 1000 }, (_, i) => {
  const variants = [
    { original_estimate: 5, score: 3 },
    { original_estimate: null, score: 8 },
    { original_estimate: null, score: null },
    { original_estimate: 0, score: 0 },
    { original_estimate: 2.5, score: null },
    { original_estimate: 13 },
  ];
  return makeFeature({
    id: `feat-${i}`,
    reference_num: `FEAT-${i}`,
    ...variants[i % variants.length],
  });
});

describe("getPoints", () => {
  bench("single feature (original_estimate present)", () => {
    getPoints(makeFeature({ original_estimate: 5, score: 3 }));
  });

  bench("single feature (fallback to score)", () => {
    getPoints(makeFeature({ original_estimate: null, score: 8 }));
  });

  bench("single feature (both null)", () => {
    getPoints(makeFeature({ original_estimate: null, score: null }));
  });

  bench("1000 features reduce to total", () => {
    features.reduce((sum, f) => sum + getPoints(f), 0);
  });
});

describe("isUnestimated", () => {
  bench("single feature (estimated)", () => {
    isUnestimated(makeFeature({ original_estimate: 5 }));
  });

  bench("single feature (unestimated)", () => {
    isUnestimated(makeFeature({ original_estimate: null, score: null }));
  });

  bench("filter 1000 features for unestimated", () => {
    features.filter(isUnestimated);
  });
});

describe("formatPoints", () => {
  bench("integer value", () => {
    formatPoints(5);
  });

  bench("float value", () => {
    formatPoints(3.14159);
  });

  bench("zero", () => {
    formatPoints(0);
  });

  bench("format 1000 values", () => {
    for (const f of features) {
      formatPoints(getPoints(f));
    }
  });
});
