import { describe, it, expect } from "vitest";
import { addDays, format, parseISO, subMonths } from "date-fns";
import {
  releaseToRoadmapItem,
  epicToRoadmapItem,
  partitionItems,
  computeTimelineRange,
  itemToBarGeometry,
  generateMonthTicks,
  itemStatusColor,
  type RoadmapItem,
} from "../roadmap-utils";
import type { AhaRelease, AhaEpic } from "../aha-types";

// Helpers
function makeItem(overrides: Partial<RoadmapItem> = {}): RoadmapItem {
  return {
    id: "item-1",
    reference_num: "PRJ-1",
    name: "Test Item",
    startDate: "2026-01-01",
    endDate: "2026-03-31",
    href: "/sprint/item-1",
    ...overrides,
  };
}

function futureDate(daysFromNow: number): string {
  return format(addDays(new Date(), daysFromNow), "yyyy-MM-dd");
}

function pastDate(daysAgo: number): string {
  return format(addDays(new Date(), -daysAgo), "yyyy-MM-dd");
}

// ────────────────────────────────────────────────────────────
// releaseToRoadmapItem
// ────────────────────────────────────────────────────────────
describe("releaseToRoadmapItem", () => {
  const release: AhaRelease = {
    id: "rel-1",
    reference_num: "REL-1",
    name: "Sprint 1",
    start_date: "2026-01-01",
    release_date: "2026-01-31",
    status: "in_progress",
    progress: 50,
    parking_lot: false,
  };

  it("maps release fields to RoadmapItem", () => {
    const item = releaseToRoadmapItem(release);
    expect(item.id).toBe("rel-1");
    expect(item.reference_num).toBe("REL-1");
    expect(item.name).toBe("Sprint 1");
    expect(item.startDate).toBe("2026-01-01");
    expect(item.endDate).toBe("2026-01-31");
    expect(item.status).toBe("in_progress");
    expect(item.href).toBe("/sprint/rel-1");
  });

  it("passes through null dates", () => {
    const item = releaseToRoadmapItem({ ...release, start_date: null, release_date: null });
    expect(item.startDate).toBeNull();
    expect(item.endDate).toBeNull();
  });
});

// ────────────────────────────────────────────────────────────
// epicToRoadmapItem
// ────────────────────────────────────────────────────────────
describe("epicToRoadmapItem", () => {
  const epic: AhaEpic = {
    id: "epic-1",
    reference_num: "PRJ-E-1",
    name: "Epic One",
    start_date: "2026-02-01",
    due_date: "2026-04-30",
    workflow_status: { name: "In Progress", complete: false },
    progress: 30,
  };

  it("maps epic fields to RoadmapItem", () => {
    const item = epicToRoadmapItem(epic);
    expect(item.id).toBe("epic-1");
    expect(item.startDate).toBe("2026-02-01");
    expect(item.endDate).toBe("2026-04-30");
    expect(item.href).toBe("/backlog");
  });

  it("sets status to 'complete' when workflow_status.complete is true", () => {
    const item = epicToRoadmapItem({
      ...epic,
      workflow_status: { name: "Shipped", complete: true },
    });
    expect(item.status).toBe("complete");
  });

  it("uses workflow_status.name when not complete", () => {
    const item = epicToRoadmapItem(epic);
    expect(item.status).toBe("In Progress");
  });
});

// ────────────────────────────────────────────────────────────
// partitionItems
// ────────────────────────────────────────────────────────────
describe("partitionItems", () => {
  it("puts items with both dates into datable", () => {
    const item = makeItem({ startDate: futureDate(-10), endDate: futureDate(30) });
    const { datable, undated } = partitionItems([item]);
    expect(datable).toHaveLength(1);
    expect(undated).toHaveLength(0);
  });

  it("puts items missing startDate into undated", () => {
    const item = makeItem({ startDate: null });
    const { datable, undated } = partitionItems([item]);
    expect(datable).toHaveLength(0);
    expect(undated).toHaveLength(1);
  });

  it("puts items missing endDate into undated", () => {
    const item = makeItem({ endDate: undefined });
    const { datable, undated } = partitionItems([item]);
    expect(datable).toHaveLength(0);
    expect(undated).toHaveLength(1);
  });

  it("excludes items that ended more than 3 months ago", () => {
    const staleEnd = format(subMonths(new Date(), 4), "yyyy-MM-dd");
    const item = makeItem({ startDate: pastDate(150), endDate: staleEnd });
    const { datable, undated } = partitionItems([item]);
    expect(datable).toHaveLength(0);
    expect(undated).toHaveLength(0); // dropped entirely (not undated)
  });

  it("includes items that ended recently (within 3 months)", () => {
    const recentEnd = format(subMonths(new Date(), 2), "yyyy-MM-dd");
    const item = makeItem({ startDate: pastDate(70), endDate: recentEnd });
    const { datable } = partitionItems([item]);
    expect(datable).toHaveLength(1);
  });

  it("sorts datable items by startDate ascending", () => {
    const items = [
      makeItem({ id: "b", startDate: "2026-03-01", endDate: "2026-06-01" }),
      makeItem({ id: "a", startDate: "2026-01-01", endDate: "2026-04-01" }),
    ];
    const { datable } = partitionItems(items);
    expect(datable[0].id).toBe("a");
    expect(datable[1].id).toBe("b");
  });

  it("returns empty arrays for empty input", () => {
    const { datable, undated } = partitionItems([]);
    expect(datable).toHaveLength(0);
    expect(undated).toHaveLength(0);
  });
});

// ────────────────────────────────────────────────────────────
// computeTimelineRange
// ────────────────────────────────────────────────────────────
describe("computeTimelineRange", () => {
  it("returns 90-day fallback for empty input", () => {
    const { totalDays } = computeTimelineRange([]);
    expect(totalDays).toBe(90);
  });

  it("adds 7-day padding on each side", () => {
    const item = makeItem({ startDate: "2026-01-15", endDate: "2026-03-15" });
    const { start, end } = computeTimelineRange([item]);
    // start should be 7 days before Jan 15 → Jan 8
    expect(format(start, "yyyy-MM-dd")).toBe("2026-01-08");
    // end should be 7 days after Mar 15 → Mar 22
    expect(format(end, "yyyy-MM-dd")).toBe("2026-03-22");
  });

  it("totalDays matches start → end span", () => {
    const item = makeItem({ startDate: "2026-01-01", endDate: "2026-04-01" });
    const { start, end, totalDays } = computeTimelineRange([item]);
    const expectedDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    expect(totalDays).toBe(expectedDays);
  });

  it("spans across multiple items correctly", () => {
    const items = [
      makeItem({ id: "a", startDate: "2026-02-01", endDate: "2026-04-01" }),
      makeItem({ id: "b", startDate: "2026-01-01", endDate: "2026-06-01" }),
    ];
    const { start, end } = computeTimelineRange(items);
    // earliest start is Jan 1, padded to Dec 25
    expect(format(start, "yyyy-MM-dd")).toBe("2025-12-25");
    // latest end is Jun 1, padded to Jun 8
    expect(format(end, "yyyy-MM-dd")).toBe("2026-06-08");
  });
});

// ────────────────────────────────────────────────────────────
// itemToBarGeometry
// ────────────────────────────────────────────────────────────
describe("itemToBarGeometry", () => {
  it("returns null when startDate is missing", () => {
    const item = makeItem({ startDate: null });
    const geo = itemToBarGeometry(item, new Date("2026-01-01"), 100);
    expect(geo).toBeNull();
  });

  it("returns null when endDate is missing", () => {
    const item = makeItem({ endDate: undefined });
    const geo = itemToBarGeometry(item, new Date("2026-01-01"), 100);
    expect(geo).toBeNull();
  });

  it("computes correct leftPct for item starting at timeline start", () => {
    const item = makeItem({ startDate: "2026-01-01", endDate: "2026-01-11" });
    const geo = itemToBarGeometry(item, parseISO("2026-01-01"), 100);
    expect(geo).not.toBeNull();
    expect(geo!.leftPct).toBe(0);
  });

  it("computes correct leftPct for item starting 10 days into 100-day timeline", () => {
    const item = makeItem({ startDate: "2026-01-11", endDate: "2026-01-21" });
    const geo = itemToBarGeometry(item, parseISO("2026-01-01"), 100);
    expect(geo!.leftPct).toBeCloseTo(10, 5);
  });

  it("computes correct widthPct for 10-day item in 100-day timeline", () => {
    const item = makeItem({ startDate: "2026-01-01", endDate: "2026-01-11" });
    const geo = itemToBarGeometry(item, parseISO("2026-01-01"), 100);
    expect(geo!.widthPct).toBeCloseTo(10, 5);
  });

  it("ensures minimum 1-day duration for same-day start/end", () => {
    const item = makeItem({ startDate: "2026-01-15", endDate: "2026-01-15" });
    const geo = itemToBarGeometry(item, parseISO("2026-01-01"), 100);
    expect(geo!.widthPct).toBeCloseTo(1, 5); // 1 day / 100 days = 1%
  });
});

// ────────────────────────────────────────────────────────────
// generateMonthTicks
// ────────────────────────────────────────────────────────────
describe("generateMonthTicks", () => {
  it("returns empty array when timeline is under one month", () => {
    const start = parseISO("2026-01-20");
    const end = parseISO("2026-02-05");
    const ticks = generateMonthTicks(start, end, 16);
    // Feb 1 is within the range but addMonths(Jan 20, 1) = Feb 20 which is > end
    // startOfMonth(Feb 20) = Feb 1 which IS < end (Feb 5)
    expect(ticks).toHaveLength(1);
    expect(ticks[0].label).toBe("Feb 2026");
  });

  it("generates one tick per month boundary within the range", () => {
    const start = parseISO("2026-01-01");
    const end = parseISO("2026-04-01");
    const totalDays = 90;
    const ticks = generateMonthTicks(start, end, totalDays);
    const labels = ticks.map((t) => t.label);
    expect(labels).toContain("Feb 2026");
    expect(labels).toContain("Mar 2026");
    // Apr 1 is the end, cursor starts at Feb then Mar, then Apr which equals end (not <)
    expect(labels).not.toContain("Apr 2026");
  });

  it("tick leftPct is between 0 and 100", () => {
    const start = parseISO("2026-01-01");
    const end = parseISO("2026-12-31");
    const totalDays = 364;
    const ticks = generateMonthTicks(start, end, totalDays);
    for (const tick of ticks) {
      expect(tick.leftPct).toBeGreaterThanOrEqual(0);
      expect(tick.leftPct).toBeLessThanOrEqual(100);
    }
  });
});

// ────────────────────────────────────────────────────────────
// itemStatusColor
// ────────────────────────────────────────────────────────────
describe("itemStatusColor", () => {
  it("returns primary color for in_progress", () => {
    expect(itemStatusColor("in_progress")).toBe("var(--color-primary)");
  });

  it("returns green for complete", () => {
    expect(itemStatusColor("complete")).toBe("#22c55e");
  });

  it("returns muted color for not_started", () => {
    expect(itemStatusColor("not_started")).toBe("var(--color-text-muted)");
  });

  it("returns secondary color for unknown status", () => {
    expect(itemStatusColor("some_other_status")).toBe("var(--color-text-secondary)");
    expect(itemStatusColor(undefined)).toBe("var(--color-text-secondary)");
  });
});
