"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
    staleTime: 5 * 60 * 1000, // 5 minutes — feature lists are expensive to fetch
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
        (old: FeaturesResponse | undefined) => {
          if (!old?.features) return old;
          return {
            ...old,
            features: old.features.map((f) =>
              f.id === featureId ? { ...f, score, work_units: score } : f
            ),
          };
        }
      );

      // Optimistically update the single feature query
      queryClient.setQueryData(["feature", featureId], (old: AhaFeature | undefined) => {
        if (!old) return old;
        return { ...old, score, work_units: score };
      });

      return { previousFeatures, previousFeature, featureId };
    },
    onError: (error, _vars, context) => {
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

      // Show error toast
      const message = error instanceof Error ? error.message : "Failed to update score";
      toast.error("Score update failed", {
        description: `${message}. Changes have been reverted.`,
      });
    },
    onSettled: (_data, _error, { featureId }) => {
      // Refetch to ensure server state is synced (but UI already updated)
      queryClient.invalidateQueries({ queryKey: ["features"] });
      queryClient.invalidateQueries({ queryKey: ["feature", featureId] });
    },
  });
}

export function useUpdateFeatureEstimate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      featureId,
      points,
      field,
    }: {
      featureId: string;
      points: number;
      field: "score" | "work_units" | "original_estimate";
    }) => {
      const res = await fetch(`/api/aha/features/${featureId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: points }),
      });
      if (!res.ok) throw new Error("Failed to update estimate");
      return res.json();
    },
    onMutate: async ({ featureId, points, field }) => {
      await queryClient.cancelQueries({ queryKey: ["features"] });
      await queryClient.cancelQueries({ queryKey: ["iteration-features"] });
      await queryClient.cancelQueries({ queryKey: ["feature", featureId] });

      const previousFeatures = queryClient.getQueriesData({ queryKey: ["features"] });
      const previousIterationFeatures = queryClient.getQueriesData({ queryKey: ["iteration-features"] });
      const previousFeature = queryClient.getQueryData(["feature", featureId]);

      // Optimistically update feature lists
      const updateFn = (old: FeaturesResponse | undefined) => {
        if (!old?.features) return old;
        return {
          ...old,
          features: old.features.map((f) =>
            f.id === featureId ? { ...f, [field]: points } : f
          ),
        };
      };
      queryClient.setQueriesData({ queryKey: ["features"] }, updateFn);
      queryClient.setQueriesData({ queryKey: ["iteration-features"] }, updateFn);

      queryClient.setQueryData(["feature", featureId], (old: AhaFeature | undefined) => {
        if (!old) return old;
        return { ...old, [field]: points };
      });

      return { previousFeatures, previousIterationFeatures, previousFeature, featureId };
    },
    onError: (error, vars, context) => {
      if (context?.previousFeatures) {
        for (const [key, data] of context.previousFeatures) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousIterationFeatures) {
        for (const [key, data] of context.previousIterationFeatures) {
          queryClient.setQueryData(key, data);
        }
      }
      if (context?.previousFeature) {
        queryClient.setQueryData(["feature", context.featureId], context.previousFeature);
      }

      // Show error toast
      const message = error instanceof Error ? error.message : "Failed to update estimate";
      toast.error("Estimate update failed", {
        description: `${message}. Changes have been reverted.`,
      });
    },
    onSettled: (_data, _error, { featureId }) => {
      queryClient.invalidateQueries({ queryKey: ["features"] });
      queryClient.invalidateQueries({ queryKey: ["iteration-features"] });
      queryClient.invalidateQueries({ queryKey: ["feature", featureId] });
    },
  });
}
