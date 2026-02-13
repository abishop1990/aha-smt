"use client";

import { useSprintMetrics } from "@/hooks/use-sprint-metrics";
import { VelocityChart } from "@/components/metrics/velocity-chart";
import { MetricSummaryCards } from "@/components/metrics/metric-summary-cards";
import { MemberPerformanceTable } from "@/components/metrics/member-performance-table";
import { SprintComparisonCard } from "@/components/metrics/sprint-comparison-card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function MetricsPageContent() {
  const [sourceType, setSourceType] = useState<"iteration" | "release">("iteration");
  const { data: metrics, isLoading } = useSprintMetrics(sourceType, 10);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Sprint Metrics</h1>
          <p className="text-text-secondary mt-1">
            Last 10 sprints - live data from Aha!
          </p>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-border rounded-md p-0.5">
          <button
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              sourceType === "iteration"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            )}
            onClick={() => setSourceType("iteration")}
          >
            Iteration
          </button>
          <button
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              sourceType === "release"
                ? "bg-primary text-white"
                : "text-text-secondary hover:text-text-primary"
            )}
            onClick={() => setSourceType("release")}
          >
            Release
          </button>
        </div>
      </div>

      {!metrics || metrics.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-12 w-12" />}
          title="No sprint data available"
          description={`No ${sourceType === "iteration" ? "iterations" : "releases"} with dates found. Create sprints in Aha! to see metrics.`}
        />
      ) : (
        <>
          <MetricSummaryCards snapshots={metrics} />
          <VelocityChart snapshots={metrics} />
          <SprintComparisonCard snapshots={metrics} />
          <MemberPerformanceTable snapshots={metrics} />
        </>
      )}
    </div>
  );
}


export default function MetricsPage() {
  return (
    <ErrorBoundary>
      <MetricsPageContent />
    </ErrorBoundary>
  );
}
