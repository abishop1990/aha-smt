import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface BurndownEntry {
  id: number;
  releaseId: string;
  releaseRefNum: string;
  capturedDate: string; // YYYY-MM-DD
  totalPointsPlanned: number;
  pointsRemaining: number;
  pointsCompleted: number;
  featuresCompleted: number;
  sourceType: string;
  capturedAt: string;
}

export function useSprintBurndown(releaseId: string | null) {
  return useQuery<{ entries: BurndownEntry[] }>({
    queryKey: ["sprint-burndown", releaseId],
    queryFn: async () => {
      const res = await fetch(`/api/sprint-snapshots/${releaseId}/burndown`);
      if (!res.ok) throw new Error("Failed to fetch burndown");
      return res.json();
    },
    enabled: !!releaseId,
    staleTime: 60_000,
  });
}

export function useCaptureBurndown(releaseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/sprint-snapshots/${releaseId}/burndown`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to capture burndown");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sprint-burndown", releaseId] });
    },
  });
}
