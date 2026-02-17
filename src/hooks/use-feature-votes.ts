"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "./use-current-user";
import type { AhaVote } from "@/lib/aha-types";

interface VotesResponse {
  votes: AhaVote[];
}

export function useFeatureVotes(featureId: string | null) {
  const queryClient = useQueryClient();
  const { data: currentUser } = useCurrentUser();

  const votesQuery = useQuery<VotesResponse>({
    queryKey: ["feature-votes", featureId],
    queryFn: async () => {
      const res = await fetch(`/api/aha/features/${featureId}/votes`);
      if (!res.ok) throw new Error("Failed to fetch votes");
      return res.json();
    },
    enabled: !!featureId,
    staleTime: Infinity, // Never auto-refresh — user clicks Refresh
    refetchOnWindowFocus: false,
    refetchOnMount: true,
  });

  const votes = votesQuery.data?.votes ?? [];
  const currentUserVote = currentUser
    ? votes.find((v) => v.user.id === currentUser.id) ?? null
    : null;

  const castVote = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/aha/features/${featureId}/votes`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to cast vote");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-votes", featureId] });
    },
  });

  const removeVote = useMutation({
    mutationFn: async (voteId: string) => {
      const res = await fetch(`/api/aha/features/${featureId}/votes/${voteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove vote");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feature-votes", featureId] });
    },
  });

  return {
    votes,
    currentUserVote,
    isLoading: votesQuery.isLoading,
    isFetching: votesQuery.isFetching,
    refetch: votesQuery.refetch,
    castVote,
    removeVote,
  };
}
