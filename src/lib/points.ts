import type { AhaFeature } from "./aha-types";

/** Single source of truth: prefer original_estimate, fall back to score. */
export function getPoints(feature: AhaFeature): number {
  return feature.original_estimate ?? feature.score ?? 0;
}

/** True when the feature has no meaningful point estimate. */
export function isUnestimated(feature: AhaFeature): boolean {
  const pts = feature.original_estimate ?? feature.score;
  return pts === null || pts === undefined || pts === 0;
}

/** Format a numeric point value: hide decimals when whole, max 2 decimal places otherwise. */
export function formatPoints(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return Number(value.toFixed(2)).toString();
}
