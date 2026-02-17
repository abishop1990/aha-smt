"use client";

import { useQuery } from "@tanstack/react-query";
import { useReleases } from "./use-releases";
import { useIterations } from "./use-iterations";
import type { AhaFeature } from "@/lib/aha-types";
import { getPoints } from "@/lib/points";

export interface SprintMetrics {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  sourceType: "release" | "iteration";
  totalPointsPlanned: number;
  totalPointsCompleted: number;
  totalFeaturesPlanned: number;
  totalFeaturesCompleted: number;
  memberMetrics: Record<string, { name: string; planned: number; completed: number }>;
}

async function fetchFeaturesForRelease(releaseId: string): Promise<AhaFeature[]> {
  const res = await fetch(`/api/aha/releases/${releaseId}/features`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.features ?? [];
}

async function fetchFeaturesForIteration(iterationRef: string): Promise<AhaFeature[]> {
  const res = await fetch(`/api/aha/iterations/${iterationRef}/features`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.features ?? [];
}

function calculateMetrics(
  features: AhaFeature[],
  id: string,
  name: string,
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  sourceType: "release" | "iteration"
): SprintMetrics {
  const totalPointsPlanned = features.reduce((sum, f) => sum + getPoints(f), 0);
  const completedFeatures = features.filter((f) => f.workflow_status?.complete);
  const totalPointsCompleted = completedFeatures.reduce((sum, f) => sum + getPoints(f), 0);

  // Calculate per-member metrics
  const memberMetrics: Record<string, { name: string; planned: number; completed: number }> = {};

  for (const feature of features) {
    const userId = feature.assigned_to_user?.id;
    const userName = feature.assigned_to_user?.name;
    if (userId && userName) {
      if (!memberMetrics[userId]) {
        memberMetrics[userId] = { name: userName, planned: 0, completed: 0 };
      }
      const points = getPoints(feature);
      memberMetrics[userId].planned += points;
      if (feature.workflow_status?.complete) {
        memberMetrics[userId].completed += points;
      }
    }
  }

  return {
    id,
    name,
    startDate: startDate ?? null,
    endDate: endDate ?? null,
    sourceType,
    totalPointsPlanned,
    totalPointsCompleted,
    totalFeaturesPlanned: features.length,
    totalFeaturesCompleted: completedFeatures.length,
    memberMetrics,
  };
}

export function useSprintMetrics(sourceType: "release" | "iteration", limit = 10) {
  const { data: releasesData } = useReleases();
  const { data: iterationsData } = useIterations();

  // Include a fingerprint of the upstream data in the key so metrics recompute
  // when releases or iterations change (stale-closure prevention).
  const releaseIds = releasesData?.releases.map((r) => r.id).join(",") ?? "";
  const iterationIds = iterationsData?.iterations.map((i) => i.id).join(",") ?? "";

  return useQuery<SprintMetrics[]>({
    queryKey: ["sprint-metrics", sourceType, limit, releaseIds, iterationIds],
    queryFn: async () => {
      if (sourceType === "iteration") {
        const iterations = iterationsData?.iterations ?? [];
        // Sort by start date descending, take last N
        const sorted = [...iterations]
          .filter((it) => it.start_date) // Only include iterations with dates
          .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""))
          .slice(0, limit);

        // Fetch all features in parallel to avoid N+1 query problem
        const allFeatures = await Promise.all(
          sorted.map((iteration) => fetchFeaturesForIteration(iteration.reference_num))
        );

        const results = sorted.map((iteration, index) =>
          calculateMetrics(
            allFeatures[index],
            iteration.id,
            iteration.name,
            iteration.start_date,
            iteration.end_date,
            "iteration"
          )
        );

        // Return in chronological order (oldest first for display)
        return results.reverse();
      } else {
        const releases = (releasesData?.releases ?? [])
          .filter((r) => !r.parking_lot && r.start_date); // Exclude parking lot and releases without dates

        // Sort by start date descending, take last N
        const sorted = [...releases]
          .sort((a, b) => (b.start_date ?? "").localeCompare(a.start_date ?? ""))
          .slice(0, limit);

        // Fetch all features in parallel to avoid N+1 query problem
        const allFeatures = await Promise.all(
          sorted.map((release) => fetchFeaturesForRelease(release.id))
        );

        const results = sorted.map((release, index) =>
          calculateMetrics(
            allFeatures[index],
            release.id,
            release.name,
            release.start_date,
            release.release_date,
            "release"
          )
        );

        // Return in chronological order (oldest first for display)
        return results.reverse();
      }
    },
    enabled: sourceType === "iteration" ? !!iterationsData : !!releasesData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
