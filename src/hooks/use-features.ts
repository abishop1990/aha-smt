"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AhaFeature } from "@/lib/aha-types";

interface FeaturesResponse {
  features: AhaFeature[];
  total: number;
}

export function useFeatures(releaseId: string | null, options?: { unestimatedOnly?: boolean }) {
  return useQuery<FeaturesResponse>({
    queryKey: ["features", releaseId, options?.unestimatedOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.unestimatedOnly) params.set("unestimated", "true");
      const res = await fetch(`/api/aha/releases/${releaseId}/features?${params}`);
      if (!res.ok) throw new Error("Failed to fetch features");
      return res.json();
    },
    enabled: !!releaseId,
  });
}

export function useFeature(featureId: string | null) {
  return useQuery<AhaFeature>({
    queryKey: ["feature", featureId],
    queryFn: async () => {
      const res = await fetch(`/api/aha/features/${featureId}`);
      if (!res.ok) throw new Error("Failed to fetch feature");
      return res.json();
    },
    enabled: !!featureId,
  });
}

export function useUpdateFeatureScore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ featureId, score }: { featureId: string; score: number }) => {
      const res = await fetch(`/api/aha/features/${featureId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });
      if (!res.ok) throw new Error("Failed to update score");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      queryClient.invalidateQueries({ queryKey: ["feature"] });
    },
  });
}
