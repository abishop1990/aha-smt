"use client";

import { useQuery } from "@tanstack/react-query";
import type { PlanningPokerVote } from "@/lib/aha-types";

// Mirrors PLANNING_POKER_BATCH_SIZE in aha-client (server-only module)
const BATCH_SIZE = 50;

/**
 * Votes for the current feature, fetched together with the rest of its queue
 * chunk so walking the estimation queue costs one Aha request per 50 features.
 */
export function usePlanningPokerVotes(queueIds: string[], currentId: string | null) {
  const index = currentId ? queueIds.indexOf(currentId) : -1;
  const chunkStart = index >= 0 ? Math.floor(index / BATCH_SIZE) * BATCH_SIZE : 0;
  const chunk = index >= 0 ? queueIds.slice(chunkStart, chunkStart + BATCH_SIZE) : [];

  return useQuery({
    queryKey: ["planning-poker-votes", chunk],
    queryFn: async (): Promise<{ votesByFeature: Record<string, PlanningPokerVote[]> }> => {
      const res = await fetch(`/api/aha/poker-votes?ids=${chunk.join(",")}`);
      if (!res.ok) throw new Error("Failed to fetch planning poker votes");
      return res.json();
    },
    enabled: chunk.length > 0,
    staleTime: 30 * 1000, // votes change while the team is estimating
    select: (data) => (currentId ? data.votesByFeature[currentId] ?? [] : []),
  });
}
