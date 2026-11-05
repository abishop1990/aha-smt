"use client";

import { useMemo } from "react";
import { RefreshCw, Spade } from "lucide-react";
import { usePlanningPokerVotes } from "@/hooks/use-planning-poker";
import { summarizePokerVotes } from "@/lib/estimation-calibration";
import { formatPoints } from "@/lib/points";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PlanningPokerPanelProps {
  featureId: string;
  /** Feature ids in queue order; votes are fetched for the current feature's chunk in one request. */
  queueIds: string[];
}

/** Read-only view of votes cast through Aha's planning-poker extension. */
export function PlanningPokerPanel({ featureId, queueIds }: PlanningPokerPanelProps) {
  const { data, isLoading, isError, isFetching, refetch } = usePlanningPokerVotes(queueIds, featureId);

  const votes = useMemo(
    () =>
      [...(data ?? [])].sort(
        (a, b) => (a.estimate ?? Infinity) - (b.estimate ?? Infinity) || a.name.localeCompare(b.name)
      ),
    [data]
  );
  const summary = useMemo(() => summarizePokerVotes(votes), [votes]);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Spade className="h-4 w-4 text-text-secondary" />
          <span className="text-sm font-medium text-text-primary">
            Planning poker
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
      ) : isError ? (
        <p className="text-xs text-danger">Couldn&apos;t load votes from Aha</p>
      ) : votes.length === 0 ? (
        <p className="text-xs text-text-muted">
          No votes yet. The team votes from the feature in Aha.
        </p>
      ) : (
        <>
          <div className="flex items-center gap-3 mb-3 text-xs text-text-secondary">
            {summary.median != null && (
              <span>
                Median <span className="font-semibold text-text-primary">{formatPoints(summary.median)}</span>
              </span>
            )}
            {summary.min != null && summary.max != null && !summary.consensus && (
              <span>
                Range {formatPoints(summary.min)}–{formatPoints(summary.max)}
              </span>
            )}
            {summary.consensus && <Badge variant="success">Consensus</Badge>}
            {summary.unknownCount > 0 && <span>{summary.unknownCount} unsure</span>}
          </div>
          <ul className="flex flex-wrap gap-2">
            {votes.map((vote) => (
              <li
                key={vote.userId}
                className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs"
              >
                <span className="font-semibold text-text-primary">
                  {vote.estimate == null ? "?" : formatPoints(vote.estimate)}
                </span>
                <span className="text-text-secondary">{vote.name}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
