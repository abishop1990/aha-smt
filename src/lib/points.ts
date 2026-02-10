import type { AhaFeature } from "./aha-types";

/** Single source of truth: prefer work_units, fall back to score. */
export function getPoints(feature: AhaFeature): number {
  return feature.work_units ?? feature.score ?? 0;
}

/** True when the feature has no meaningful point estimate. */
export function isUnestimated(feature: AhaFeature): boolean {
  const pts = feature.work_units ?? feature.score;
  return pts === null || pts === undefined || pts === 0;
}
