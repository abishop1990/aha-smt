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
    staleTime: 30 * 1000, // 30 seconds - want fresh data when viewing details
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
    onMutate: async ({ featureId, score }) => {
      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ["features"] });
      await queryClient.cancelQueries({ queryKey: ["feature", featureId] });

      // Snapshot previous values for rollback
      const previousFeatures = queryClient.getQueriesData({ queryKey: ["features"] });
      const previousFeature = queryClient.getQueryData(["feature", featureId]);

      // Optimistically update the feature in all feature list queries
      queryClient.setQueriesData(
        { queryKey: ["features"] },
        (old: any) => {
          if (!old?.features) return old;
          return {
            ...old,
            features: old.features.map((f: any) =>
              f.id === featureId ? { ...f, score } : f
            ),
          };
        }
      );

      // Optimistically update the single feature query
      queryClient.setQueryData(["feature", featureId], (old: any) => {
        if (!old) return old;
        return { ...old, score };
      });

      return { previousFeatures, previousFeature, featureId };
    },
    onError: (_err, _vars, context) => {
      // Rollback on error
      if (context?.previousFeatures) {
        for (const [key, data] of context.previousFeatures) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousFeature) {
        queryClient.setQueryData(
          ["feature", context.featureId],
          context.previousFeature
        );
      }
    },
    onSettled: (_data, _error, { featureId }) => {
      // Refetch to ensure server state is synced (but UI already updated)
      queryClient.invalidateQueries({ queryKey: ["features"] });
      queryClient.invalidateQueries({ queryKey: ["feature", featureId] });
    },
  });
}
