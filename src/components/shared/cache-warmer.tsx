"use client";

import { useEffect } from "react";
import { useReleases } from "@/hooks/use-releases";
import { usePrefetch } from "@/hooks/use-prefetch";

/**
 * Invisible component that warms the cache on mount.
 * Fetches the active release's features in the background
 * so they're ready when the user navigates to backlog/sprint/estimate.
 */
export function CacheWarmer() {
  const { data: releasesData } = useReleases();
  const { prefetchFeatures } = usePrefetch();
  const latestRelease = releasesData?.releases?.[0];

  useEffect(() => {
    if (latestRelease?.id) {
      // Warm features for the most likely release the user will view
      prefetchFeatures(latestRelease.id);
    }
  }, [latestRelease?.id, prefetchFeatures]);

  return null; // Renders nothing — pure side-effect
}
