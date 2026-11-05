import { describe, it, expect } from "vitest";
import { summarizePokerVotes, summarizeEstimationHistory } from "../estimation-calibration";
import type { PlanningPokerVote } from "../aha-types";

function vote(userId: string, estimate: number | null): PlanningPokerVote {
  return { userId, name: userId, estimate, updatedAt: "2026-01-01T00:00:00Z" };
}

describe("summarizePokerVotes", () => {
  it("returns empty summary for no votes", () => {
    expect(summarizePokerVotes([])).toEqual({
      voteCount: 0,
      unknownCount: 0,
      min: null,
      max: null,
      median: null,
      consensus: false,
    });
  });

  it("computes min, max and odd-count median", () => {
    const s = summarizePokerVotes([vote("a", 5), vote("b", 2), vote("c", 3)]);
    expect(s).toMatchObject({ min: 2, max: 5, median: 3, consensus: false });
  });

  it("averages the middle two for an even count", () => {
    expect(summarizePokerVotes([vote("a", 2), vote("b", 3)]).median).toBe(2.5);
  });

  it("excludes unknown votes from stats but counts them", () => {
    const s = summarizePokerVotes([vote("a", 3), vote("b", null), vote("c", 3)]);
    expect(s).toMatchObject({ voteCount: 3, unknownCount: 1, median: 3, consensus: true });
  });

  it("reports no consensus when only unknown votes exist", () => {
    const s = summarizePokerVotes([vote("a", null)]);
    expect(s.consensus).toBe(false);
    expect(s.median).toBeNull();
  });
});

describe("summarizeEstimationHistory", () => {
  it("returns zero override rate for no entries", () => {
    expect(summarizeEstimationHistory([])).toEqual({ count: 0, distribution: [], overrideRate: 0 });
  });

  it("orders distribution by frequency then points", () => {
    const s = summarizeEstimationHistory([
      { suggestedPoints: 5, finalPoints: 5 },
      { suggestedPoints: 5, finalPoints: 3 },
      { suggestedPoints: 5, finalPoints: 3 },
      { suggestedPoints: 5, finalPoints: 8 },
    ]);
    expect(s.distribution).toEqual([
      { points: 3, count: 2 },
      { points: 5, count: 1 },
      { points: 8, count: 1 },
    ]);
    expect(s.overrideRate).toBe(0.75);
  });
});
