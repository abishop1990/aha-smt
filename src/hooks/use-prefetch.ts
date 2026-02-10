"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Returns prefetch functions that warm the React Query cache
 * by firing background requests before the user navigates.
 */
export function usePrefetch() {
  const queryClient = useQueryClient();

  const prefetchFeatures = useCallback(
    (releaseId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["features", releaseId, undefined],
        queryFn: async () => {
          const res = await fetch(`/api/aha/releases/${releaseId}/features`);
          if (!res.ok) throw new Error("prefetch failed");
          return res.json();
        },
        staleTime: 60 * 1000,
      });
    },
    [queryClient]
  );

  const prefetchReleases = useCallback(
    (productId?: string) => {
      const params = new URLSearchParams();
      if (productId) params.set("productId", productId);
      queryClient.prefetchQuery({
        queryKey: ["releases", productId],
        queryFn: async () => {
          const res = await fetch(`/api/aha/releases?${params}`);
          if (!res.ok) throw new Error("prefetch failed");
          return res.json();
        },
        staleTime: 60 * 1000,
      });
    },
    [queryClient]
  );

  const prefetchFeature = useCallback(
    (featureId: string) => {
      queryClient.prefetchQuery({
        queryKey: ["feature", featureId],
        queryFn: async () => {
          const res = await fetch(`/api/aha/features/${featureId}`);
          if (!res.ok) throw new Error("prefetch failed");
          return res.json();
        },
        staleTime: 60 * 1000,
      });
    },
    [queryClient]
  );

  const prefetchIterations = useCallback(
    () => {
      queryClient.prefetchQuery({
        queryKey: ["iterations"],
        queryFn: async () => {
          const res = await fetch("/api/aha/iterations");
          if (!res.ok) throw new Error("prefetch failed");
          return res.json();
        },
        staleTime: 5 * 60 * 1000,
      });
    },
    [queryClient]
  );

  const prefetchIterationFeatures = useCallback(
    (iterationRef: string) => {
      queryClient.prefetchQuery({
        queryKey: ["iteration-features", iterationRef, undefined],
        queryFn: async () => {
          const res = await fetch(`/api/aha/iterations/${iterationRef}/features`);
          if (!res.ok) throw new Error("prefetch failed");
          return res.json();
        },
        staleTime: 60 * 1000,
      });
    },
    [queryClient]
  );

  return { prefetchFeatures, prefetchReleases, prefetchFeature, prefetchIterations, prefetchIterationFeatures };
}
