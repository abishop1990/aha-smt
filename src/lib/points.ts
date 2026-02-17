import type { AhaFeature } from "./aha-types";
import { getConfigSync, type PointField } from "./config";

/** Extract points from a feature using the configured source priority order. */
export function getPoints(feature: AhaFeature): number {
  const { source } = getConfigSync().points;
  for (const field of source) {
    const val = feature[field as PointField];
    if (val != null) return val;
  }
  return 0;
}

/** True when the feature has no meaningful point estimate. */
export function isUnestimated(feature: AhaFeature): boolean {
  const { source } = getConfigSync().points;
  for (const field of source) {
    const val = feature[field as PointField];
    if (val != null && val !== 0) return false;
  }
  return true;
}

/** Format a numeric point value: hide decimals when whole, max 2 decimal places otherwise. */
export function formatPoints(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return Number(value.toFixed(2)).toString();
}
