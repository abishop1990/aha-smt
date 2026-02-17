"use client";

import { useQuery } from "@tanstack/react-query";
import type { AhaFeature } from "@/lib/aha-types";

interface FeaturesResponse {
  features: AhaFeature[];
  total: number;
}

export function useFeaturesByTag(
  productId: string | null,
  tag: string | null,
  options?: { unestimatedOnly?: boolean }
) {
  return useQuery<FeaturesResponse>({
    queryKey: ["features-by-tag", productId, tag, options?.unestimatedOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (tag) params.set("tag", tag);
      if (options?.unestimatedOnly) params.set("unestimated", "true");
      const res = await fetch(`/api/aha/products/${productId}/features?${params}`);
      if (!res.ok) throw new Error("Failed to fetch features");
      return res.json();
    },
    enabled: !!productId && !!tag,
  });
}
