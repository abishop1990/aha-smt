"use client";

import { useReleases } from "@/hooks/use-releases";
import { useSprintSnapshots, useCaptureSnapshot } from "@/hooks/use-sprint-snapshots";
import { VelocityChart } from "@/components/metrics/velocity-chart";
import { MetricSummaryCards } from "@/components/metrics/metric-summary-cards";
import { MemberPerformanceTable } from "@/components/metrics/member-performance-table";
import { SprintComparisonCard } from "@/components/metrics/sprint-comparison-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { BarChart3, Camera } from "lucide-react";
import { useState } from "react";

export default function MetricsPage() {
  const { data: releasesData } = useReleases();
  const { data: snapshotsData, isLoading } = useSprintSnapshots();
  const captureSnapshot = useCaptureSnapshot();
  const [selectedReleaseId, setSelectedReleaseId] = useState<string | null>(null);

  const snapshots = snapshotsData?.snapshots ?? [];
  const releases = releasesData?.releases ?? [];

  const handleCapture = async () => {
    const releaseId = selectedReleaseId ?? releases[0]?.id;
    if (!releaseId) return;
    await captureSnapshot.mutateAsync(releaseId);
  };

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
            Historical sprint performance and velocity tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          {releases.length > 0 && (
            <select
              className="bg-surface border border-border rounded-md px-3 py-2 text-sm text-text-primary"
              value={selectedReleaseId ?? releases[0]?.id ?? ""}
              onChange={(e) => setSelectedReleaseId(e.target.value)}
            >
              {releases.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <Button
            onClick={handleCapture}
            disabled={captureSnapshot.isPending || releases.length === 0}
          >
            <Camera className="h-4 w-4 mr-2" />
            {captureSnapshot.isPending ? "Capturing..." : "Capture Sprint"}
          </Button>
        </div>
      </div>

      {snapshots.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="h-12 w-12" />}
          title="No sprint data yet"
          description="Capture a sprint snapshot to start tracking metrics. Click 'Capture Sprint' when a sprint ends."
        />
      ) : (
        <>
          <MetricSummaryCards snapshots={snapshots} />
          <VelocityChart snapshots={snapshots} />
          <SprintComparisonCard snapshots={snapshots} />
          <MemberPerformanceTable snapshots={snapshots} />
        </>
      )}
    </div>
  );
}
