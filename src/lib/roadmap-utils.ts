import { parseISO, subMonths, differenceInDays, addDays, startOfMonth, addMonths, format } from "date-fns";
import type { AhaRelease } from "./aha-types";
import type { AhaEpic } from "./aha-types";

// A normalized item the Gantt works with regardless of source type
export interface RoadmapItem {
  id: string;
  reference_num: string;
  name: string;
  startDate: string | null | undefined;
  endDate: string | null | undefined;
  status?: string;
  href: string;
}

export function releaseToRoadmapItem(r: AhaRelease): RoadmapItem {
  return {
    id: r.id,
    reference_num: r.reference_num,
    name: r.name,
    startDate: r.start_date,
    endDate: r.release_date,
    status: r.status,
    href: `/sprint/${r.id}`,
  };
}

export function epicToRoadmapItem(e: AhaEpic): RoadmapItem {
  return {
    id: e.id,
    reference_num: e.reference_num,
    name: e.name,
    startDate: e.start_date,
    endDate: e.due_date,
    status: e.workflow_status?.complete ? "complete" : e.workflow_status?.name,
    href: `/backlog`, // epics link back to backlog for now
  };
}

// Split items into datable (has both dates, not stale) and undated
export function partitionItems(items: RoadmapItem[]): {
  datable: RoadmapItem[];
  undated: RoadmapItem[];
} {
  const threeMonthsAgo = subMonths(new Date(), 3);
  const datable: RoadmapItem[] = [];
  const undated: RoadmapItem[] = [];

  for (const item of items) {
    if (!item.startDate || !item.endDate) {
      undated.push(item);
      continue;
    }
    const end = parseISO(item.endDate);
    if (end < threeMonthsAgo) continue; // skip stale
    datable.push(item);
  }

  datable.sort((a, b) => (a.startDate ?? "").localeCompare(b.startDate ?? ""));
  return { datable, undated };
}

// Compute the date range for the full timeline (with 7-day padding on each side)
export function computeTimelineRange(items: RoadmapItem[]): {
  start: Date;
  end: Date;
  totalDays: number;
} {
  if (items.length === 0) {
    const now = new Date();
    return { start: now, end: addDays(now, 90), totalDays: 90 };
  }
  const starts = items.map((i) => parseISO(i.startDate!)).filter(Boolean);
  const ends = items.map((i) => parseISO(i.endDate!)).filter(Boolean);
  const minStart = addDays(new Date(Math.min(...starts.map((d) => d.getTime()))), -7);
  const maxEnd = addDays(new Date(Math.max(...ends.map((d) => d.getTime()))), 7);
  const totalDays = Math.max(differenceInDays(maxEnd, minStart), 1);
  return { start: minStart, end: maxEnd, totalDays };
}

// Get left% and width% for a bar within the timeline
export function itemToBarGeometry(
  item: RoadmapItem,
  timelineStart: Date,
  totalDays: number
): { leftPct: number; widthPct: number } | null {
  if (!item.startDate || !item.endDate) return null;
  const start = parseISO(item.startDate);
  const end = parseISO(item.endDate);
  const leftDays = differenceInDays(start, timelineStart);
  const durationDays = Math.max(differenceInDays(end, start), 1);
  const leftPct = (leftDays / totalDays) * 100;
  const widthPct = (durationDays / totalDays) * 100;
  return { leftPct, widthPct };
}

// Generate month tick marks for the X-axis header
export function generateMonthTicks(
  timelineStart: Date,
  timelineEnd: Date,
  totalDays: number
): Array<{ label: string; leftPct: number }> {
  const ticks: Array<{ label: string; leftPct: number }> = [];
  let cursor = startOfMonth(addMonths(timelineStart, 1));
  while (cursor < timelineEnd) {
    const leftDays = differenceInDays(cursor, timelineStart);
    ticks.push({
      label: format(cursor, "MMM yyyy"),
      leftPct: (leftDays / totalDays) * 100,
    });
    cursor = addMonths(cursor, 1);
  }
  return ticks;
}

// Map status to a CSS color
export function itemStatusColor(status: string | undefined): string {
  switch (status) {
    case "in_progress": return "var(--color-primary)";
    case "complete": return "#22c55e";
    case "not_started": return "var(--color-text-muted)";
    default: return "var(--color-text-secondary)";
  }
}
