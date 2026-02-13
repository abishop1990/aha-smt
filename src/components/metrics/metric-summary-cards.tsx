import type { SprintMetrics } from "@/hooks/use-sprint-metrics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatPoints } from "@/lib/points";

interface MetricSummaryCardsProps {
  snapshots: SprintMetrics[];
}

function avg(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function MetricSummaryCards({ snapshots }: MetricSummaryCardsProps) {
  const avgVelocity = avg(snapshots.map((s) => s.totalPointsCompleted));

  const accuracy = avg(
    snapshots
      .filter((s) => s.totalPointsPlanned > 0)
      .map((s) => (s.totalPointsCompleted / s.totalPointsPlanned) * 100)
  );

  // Carryover is not tracked in dynamic metrics, so we calculate it as planned - completed
  const carryoverRate = avg(
    snapshots
      .filter((s) => s.totalPointsPlanned > 0)
      .map((s) => {
        const carryover = Math.max(0, s.totalPointsPlanned - s.totalPointsCompleted);
        return (carryover / s.totalPointsPlanned) * 100;
      })
  );

  const completionRate = avg(
    snapshots
      .filter((s) => s.totalFeaturesPlanned > 0)
      .map((s) => (s.totalFeaturesCompleted / s.totalFeaturesPlanned) * 100)
  );

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">
            Avg Velocity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-text-primary">
            {formatPoints(avgVelocity)}
          </p>
          <p className="text-xs text-text-muted">points per sprint</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">
            Accuracy
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-text-primary">
            {accuracy.toFixed(1)}%
          </p>
          <p className="text-xs text-text-muted">completed vs planned</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">
            Carryover Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-text-primary">
            {carryoverRate.toFixed(1)}%
          </p>
          <p className="text-xs text-text-muted">of planned points</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-secondary">
            Completion Rate
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold text-text-primary">
            {completionRate.toFixed(1)}%
          </p>
          <p className="text-xs text-text-muted">features completed</p>
        </CardContent>
      </Card>
    </div>
  );
}
