"use client";

import { RefreshCw, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFeatureVotes } from "@/hooks/use-feature-votes";
import { cn } from "@/lib/utils";

interface VotePanelProps {
  featureId: string;
}

export function VotePanel({ featureId }: VotePanelProps) {
  const { votes, currentUserVote, isLoading, isFetching, refetch, castVote, removeVote } =
    useFeatureVotes(featureId);

  const hasVoted = !!currentUserVote;

  const handleVoteToggle = () => {
    if (hasVoted && currentUserVote) {
      removeVote.mutate(currentUserVote.id);
    } else {
      castVote.mutate();
    }
  };

  const isPending = castVote.isPending || removeVote.isPending;

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ThumbsUp className="h-4 w-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">
            Votes
            {votes.length > 0 && (
              <span className="ml-1.5 text-text-secondary">({votes.length})</span>
            )}
          </span>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="text-text-muted hover:text-text-secondary transition-colors"
          title="Refresh votes"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
        </button>
      </div>

      {isLoading ? (
        <p className="text-xs text-text-muted">Loading votes...</p>
      ) : votes.length === 0 ? (
        <p className="text-xs text-text-muted">No votes yet</p>
      ) : (
        <ul className="space-y-1 mb-3">
          {votes.map((vote) => (
            <li key={vote.id} className="text-xs text-text-secondary flex items-center gap-1.5">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full flex-shrink-0",
                  currentUserVote?.id === vote.id ? "bg-primary" : "bg-text-muted"
                )}
              />
              {vote.user.name}
            </li>
          ))}
        </ul>
      )}

      <Button
        size="sm"
        variant={hasVoted ? "outline" : "default"}
        className="w-full"
        onClick={handleVoteToggle}
        disabled={isPending || isFetching}
      >
        <ThumbsUp className={cn("h-3.5 w-3.5 mr-1.5", hasVoted && "fill-current")} />
        {isPending ? "Saving..." : hasVoted ? "Remove Vote" : "Vote"}
      </Button>
    </div>
  );
}
