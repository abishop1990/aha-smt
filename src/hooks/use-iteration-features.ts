"use client";

import { useQuery } from "@tanstack/react-query";
import type { AhaFeature } from "@/lib/aha-types";

interface IterationFeaturesResponse {
  features: AhaFeature[];
  total: number;
}

export function useIterationFeatures(
  iterationRef: string | null,
  options?: { unestimatedOnly?: boolean }
) {
  return useQuery<IterationFeaturesResponse>({
    queryKey: ["iteration-features", iterationRef, options?.unestimatedOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.unestimatedOnly) params.set("unestimated", "true");
      const res = await fetch(`/api/aha/iterations/${iterationRef}/features?${params}`);
      if (!res.ok) throw new Error("Failed to fetch iteration features");
      return res.json();
    },
    enabled: !!iterationRef,
  });
}
