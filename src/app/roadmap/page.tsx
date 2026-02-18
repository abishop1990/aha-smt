"use client";

import { useState, useMemo } from "react";
import { useReleases } from "@/hooks/use-releases";
import { useEpics } from "@/hooks/use-epics";
import { useConfig } from "@/hooks/use-config";
import { GanttChart } from "@/components/roadmap/gantt-chart";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import Link from "next/link";
import { Map } from "lucide-react";
import {
  releaseToRoadmapItem,
  epicToRoadmapItem,
  partitionItems,
  computeTimelineRange,
  generateMonthTicks,
} from "@/lib/roadmap-utils";

type ViewMode = "releases" | "epics";

function RoadmapContent() {
  const [viewMode, setViewMode] = useState<ViewMode>("releases");
  const { data: config } = useConfig();
  const teamProductId = config?.backlog.teamProductId ?? null;

  const { data: releasesData, isLoading: releasesLoading } = useReleases();
  const { data: epicsData, isLoading: epicsLoading } = useEpics(
    viewMode === "epics" ? teamProductId : null
  );

  const isLoading = viewMode === "releases" ? releasesLoading : epicsLoading;

  const { datable, undated, timelineStart, totalDays, monthTicks } = useMemo(() => {
    const rawItems =
      viewMode === "releases"
        ? (releasesData?.releases ?? []).filter((r) => !r.parking_lot).map(releaseToRoadmapItem)
        : (epicsData?.epics ?? []).map(epicToRoadmapItem);

    const { datable, undated } = partitionItems(rawItems, { showPast: viewMode === "epics" });
    const range = computeTimelineRange(datable);
    const ticks = generateMonthTicks(range.start, range.end, range.totalDays);
    return {
      datable,
      undated,
      timelineStart: range.start,
      totalDays: range.totalDays,
      monthTicks: ticks,
    };
  }, [viewMode, releasesData, epicsData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Roadmap</h1>
          <p className="text-text-secondary mt-1">Timeline view of releases and epics</p>
        </div>

        {/* View toggle */}
        <div className="flex rounded-lg border border-border overflow-hidden">
          {(["releases", "epics"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                viewMode === mode
                  ? "bg-primary text-white"
                  : "bg-surface text-text-secondary hover:text-text-primary"
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {viewMode === "epics" && !teamProductId && (
        <div className="rounded-lg border border-border bg-surface p-4 text-sm text-text-secondary">
          Epic view requires a <strong>Develop Product ID</strong> configured in{" "}
          <Link href="/settings" className="text-primary underline">Settings → Backlog</Link>.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : datable.length === 0 && undated.length === 0 ? (
        <EmptyState
          icon={<Map className="h-12 w-12" />}
          title={`No ${viewMode} found`}
          description={
            viewMode === "epics" && !teamProductId
              ? "Configure a Develop Product ID in Settings to load epics."
              : `No ${viewMode} are available for the roadmap.`
          }
        />
      ) : (
        <>
          {datable.length > 0 && (
            <GanttChart
              items={datable}
              timelineStart={timelineStart}
              totalDays={totalDays}
              monthTicks={monthTicks}
            />
          )}

          {undated.length > 0 && (
            <div>
              <h2 className="text-xs font-medium text-text-muted uppercase tracking-wider mb-3">
                No Dates
              </h2>
              <div className="space-y-1">
                {undated.map((item) => (
                  <Link key={item.id} href={item.href}>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-md border border-border hover:bg-surface text-sm text-text-secondary hover:text-text-primary transition-colors">
                      <span className="font-mono text-xs text-text-muted">{item.reference_num}</span>
                      {item.name}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <ErrorBoundary>
      <RoadmapContent />
    </ErrorBoundary>
  );
}
