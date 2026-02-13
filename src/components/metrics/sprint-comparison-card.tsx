"use client";

import type { SprintMetrics } from "@/hooks/use-sprint-metrics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPoints } from "@/lib/points";

interface SprintComparisonCardProps {
  snapshots: SprintMetrics[];
}

interface SprintSummary {
  name: string;
  planned: number;
  completed: number;
  features: number;
  featuresCompleted: number;
  carryover: number;
  completionRate: number;
}

function toSummary(snapshot: SprintMetrics): SprintSummary {
  const completionRate =
    snapshot.totalFeaturesPlanned > 0
      ? (snapshot.totalFeaturesCompleted / snapshot.totalFeaturesPlanned) * 100
      : 0;

  const carryover = Math.max(0, snapshot.totalPointsPlanned - snapshot.totalPointsCompleted);

  return {
    name: snapshot.name,
    planned: snapshot.totalPointsPlanned,
    completed: snapshot.totalPointsCompleted,
    features: snapshot.totalFeaturesPlanned,
    featuresCompleted: snapshot.totalFeaturesCompleted,
    carryover,
    completionRate,
  };
}

function DeltaIndicator({
  current,
  previous,
  higherIsBetter = true,
  suffix = "",
}: {
  current: number;
  previous: number;
  higherIsBetter?: boolean;
  suffix?: string;
}) {
  const delta = current - previous;
  if (delta === 0) return null;

  const isImprovement = higherIsBetter ? delta > 0 : delta < 0;

  return (
    <span
      className={cn(
        "ml-1 text-xs font-medium",
        isImprovement ? "text-success" : "text-danger"
      )}
    >
      {delta > 0 ? "+" : ""}
      {suffix ? `${delta.toFixed(1)}${suffix}` : formatPoints(Math.abs(delta))}
    </span>
  );
}

function StatRow({
  label,
  current,
  previous,
  higherIsBetter = true,
  format,
}: {
  label: string;
  current: number;
  previous: number;
  higherIsBetter?: boolean;
  format?: (v: number) => string;
}) {
  const fmt = format ?? ((v: number) => String(v));

  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-text-secondary">{label}</span>
      <div className="flex items-center gap-4">
        <span className="text-text-muted w-20 text-right tabular-nums">{fmt(previous)}</span>
        <div className="flex items-center justify-end w-24">
          <span className="text-text-primary text-right font-medium tabular-nums">
            {fmt(current)}
          </span>
          <DeltaIndicator
            current={current}
            previous={previous}
            higherIsBetter={higherIsBetter}
          />
        </div>
      </div>
    </div>
  );
}

export function SprintComparisonCard({ snapshots }: SprintComparisonCardProps) {
  if (snapshots.length < 2) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-secondary">
            Sprint Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">
            At least two sprint snapshots are needed for comparison.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sorted = [...snapshots].sort((a, b) => {
    const dateA = a.startDate ?? a.endDate ?? "";
    const dateB = b.startDate ?? b.endDate ?? "";
    return dateA.localeCompare(dateB);
  });
  const previous = toSummary(sorted[sorted.length - 2]);
  const current = toSummary(sorted[sorted.length - 1]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-text-secondary">
          Sprint Comparison
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Column headers */}
        <div className="flex items-center justify-between text-xs font-medium text-text-muted">
          <span>Metric</span>
          <div className="flex items-center gap-4">
            <span className="w-16 text-right">{previous.name}</span>
            <span className="w-16 text-right">{current.name}</span>
          </div>
        </div>

        <div className="space-y-3">
          <StatRow
            label="Planned Points"
            current={current.planned}
            previous={previous.planned}
            higherIsBetter={true}
            format={formatPoints}
          />
          <StatRow
            label="Completed Points"
            current={current.completed}
            previous={previous.completed}
            higherIsBetter={true}
            format={formatPoints}
          />
          <StatRow
            label="Features Planned"
            current={current.features}
            previous={previous.features}
            higherIsBetter={true}
          />
          <StatRow
            label="Features Completed"
            current={current.featuresCompleted}
            previous={previous.featuresCompleted}
            higherIsBetter={true}
          />
          <StatRow
            label="Carryover Points"
            current={current.carryover}
            previous={previous.carryover}
            higherIsBetter={false}
            format={formatPoints}
          />
          <StatRow
            label="Completion Rate"
            current={current.completionRate}
            previous={previous.completionRate}
            higherIsBetter={true}
            format={(v) => `${v.toFixed(1)}%`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
