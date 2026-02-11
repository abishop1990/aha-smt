"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface SprintSnapshot {
  id: number;
  releaseId: string;
  releaseRefNum: string;
  releaseName: string;
  startDate: string | null;
  endDate: string | null;
  totalPointsPlanned: number;
  totalPointsCompleted: number;
  totalFeaturesPlanned: number;
  totalFeaturesCompleted: number;
  carryoverPoints: number;
  memberMetrics: string;
  featureSnapshot: string;
  sourceType?: string;
  pointSource?: string;
  capturedAt: string;
}

export function useSprintSnapshots() {
  return useQuery<{ snapshots: SprintSnapshot[] }>({
    queryKey: ["sprint-snapshots"],
    queryFn: async () => {
      const res = await fetch("/api/sprint-snapshots");
      if (!res.ok) throw new Error("Failed to fetch snapshots");
      return res.json();
    },
  });
}

export function useCaptureSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      input: string | { iterationRef: string; teamProductId?: string }
    ) => {
      const body =
        typeof input === "string"
          ? { releaseId: input }
          : { iterationRef: input.iterationRef, teamProductId: input.teamProductId };

      const res = await fetch("/api/sprint-snapshots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to capture snapshot");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprint-snapshots"] });
      toast.success("Sprint snapshot captured");
    },
    onError: () => {
      toast.error("Failed to capture snapshot");
    },
  });
}
