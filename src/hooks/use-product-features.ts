"use client";

import { useQuery } from "@tanstack/react-query";
import type { AhaFeature } from "@/lib/aha-types";

interface ProductFeaturesResponse {
  features: AhaFeature[];
  team_locations: string[];
  total: number;
}

/**
 * Fetches all features for a product (no team_location filter applied).
 * The response includes `team_locations` extracted from the features,
 * so callers can derive the location dropdown without a separate API call.
 * Filtering by team_location is done client-side from the returned features.
 */
export function useProductFeatures(
  productId: string | null,
  options?: { unestimatedOnly?: boolean }
) {
  return useQuery<ProductFeaturesResponse>({
    queryKey: ["product-features", productId, options?.unestimatedOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.unestimatedOnly) params.set("unestimated", "true");
      const res = await fetch(`/api/aha/products/${productId}/features?${params}`);
      if (!res.ok) throw new Error("Failed to fetch product features");
      return res.json();
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}
