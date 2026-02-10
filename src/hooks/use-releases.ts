"use client";

import { useQuery } from "@tanstack/react-query";
import type { AhaRelease } from "@/lib/aha-types";

interface ReleasesResponse {
  releases: AhaRelease[];
  productId: string;
}

export function useReleases(productId?: string) {
  return useQuery<ReleasesResponse>({
    queryKey: ["releases", productId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (productId) params.set("productId", productId);
      const res = await fetch(`/api/aha/releases?${params}`);
      if (!res.ok) throw new Error("Failed to fetch releases");
      return res.json();
    },
  });
}
