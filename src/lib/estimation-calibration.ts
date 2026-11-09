import type { PlanningPokerVote } from "./aha-types";

export interface PokerSummary {
  voteCount: number;
  unknownCount: number;
  min: number | null;
  max: number | null;
  median: number | null;
  /** True when every numeric vote is the same value. */
  consensus: boolean;
}

function median(sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function summarizePokerVotes(votes: PlanningPokerVote[]): PokerSummary {
  const estimates = votes
    .map((v) => v.estimate)
    .filter((e): e is number => e != null)
    .sort((a, b) => a - b);

  return {
    voteCount: votes.length,
    unknownCount: votes.length - estimates.length,
    min: estimates[0] ?? null,
    max: estimates[estimates.length - 1] ?? null,
    median: median(estimates),
    consensus: estimates.length > 0 && estimates[0] === estimates[estimates.length - 1],
  };
}

export interface HistoryEntry {
  suggestedPoints: number;
  finalPoints: number;
}

export interface HistorySummary {
  count: number;
  /** Final points chosen, most frequent first. */
  distribution: Array<{ points: number; count: number }>;
  /** Share of estimates where the final points differed from the suggestion (0–1). */
  overrideRate: number;
}

export function summarizeEstimationHistory(entries: HistoryEntry[]): HistorySummary {
  const counts = new Map<number, number>();
  let overrides = 0;

  for (const e of entries) {
    counts.set(e.finalPoints, (counts.get(e.finalPoints) ?? 0) + 1);
    if (e.finalPoints !== e.suggestedPoints) overrides++;
  }

  const distribution = [...counts.entries()]
    .map(([points, count]) => ({ points, count }))
    .sort((a, b) => b.count - a.count || a.points - b.points);

  return {
    count: entries.length,
    distribution,
    overrideRate: entries.length ? overrides / entries.length : 0,
  };
}
