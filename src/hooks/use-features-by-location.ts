"use client";

import { useQuery } from "@tanstack/react-query";
import type { AhaFeature } from "@/lib/aha-types";

interface FeaturesResponse {
  features: AhaFeature[];
  total: number;
}

export function useFeaturesByLocation(
  productId: string | null,
  teamLocation: string | null,
  options?: { unestimatedOnly?: boolean }
) {
  return useQuery<FeaturesResponse>({
    queryKey: ["features-by-location", productId, teamLocation, options?.unestimatedOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (teamLocation) params.set("teamLocation", teamLocation);
      if (options?.unestimatedOnly) params.set("unestimated", "true");

      const res = await fetch(`/api/aha/products/${productId}/features?${params}`);
      if (!res.ok) throw new Error("Failed to fetch features");
      return res.json();
    },
    enabled: !!productId && !!teamLocation,
  });
}
