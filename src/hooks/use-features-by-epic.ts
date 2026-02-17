"use client";

import { useQuery } from "@tanstack/react-query";
import type { AhaFeature } from "@/lib/aha-types";

interface FeaturesResponse {
  features: AhaFeature[];
  total: number;
}

export function useFeaturesByEpic(
  epicRef: string | null,
  options?: { unestimatedOnly?: boolean }
) {
  return useQuery<FeaturesResponse>({
    queryKey: ["features-by-epic", epicRef, options?.unestimatedOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.unestimatedOnly) params.set("unestimated", "true");
      const res = await fetch(`/api/aha/epics/${epicRef}/features?${params}`);
      if (!res.ok) throw new Error("Failed to fetch features");
      return res.json();
    },
    enabled: !!epicRef,
    staleTime: 5 * 60 * 1000,
  });
}
