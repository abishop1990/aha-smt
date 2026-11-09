"use client";

import { useQuery } from "@tanstack/react-query";
import type { EstimationCriteria } from "@/lib/constants";

export interface EstimationHistoryEntry {
  id: number;
  featureId: string;
  featureRefNum: string;
  featureName: string;
  scope: string;
  complexity: string;
  unknowns: string;
  suggestedPoints: number;
  finalPoints: number;
  createdAt: string;
}

/** Past estimates recorded by this tool that used the same Scope/Complexity/Unknowns ratings. */
export function useEstimationHistoryForCriteria(criteria: EstimationCriteria) {
  return useQuery<{ history: EstimationHistoryEntry[] }>({
    queryKey: ["estimation-history", criteria.scope, criteria.complexity, criteria.unknowns],
    queryFn: async () => {
      const params = new URLSearchParams({
        scope: criteria.scope,
        complexity: criteria.complexity,
        unknowns: criteria.unknowns,
      });
      const res = await fetch(`/api/estimation-history?${params}`);
      if (!res.ok) throw new Error("Failed to fetch estimation history");
      return res.json();
    },
    staleTime: 60 * 1000,
  });
}
