"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format, eachDayOfInterval, parseISO, isWeekend } from "date-fns";
import { formatPoints } from "@/lib/points";
import { useSprintBurndown, useCaptureBurndown } from "@/hooks/use-sprint-burndown";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface SprintBurndownChartProps {
  releaseId: string;
  startDate: string | null;
  endDate: string | null;
}

export function SprintBurndownChart({ releaseId, startDate, endDate }: SprintBurndownChartProps) {
  const { data, isLoading } = useSprintBurndown(releaseId);
  const capture = useCaptureBurndown(releaseId);

  const chartData = useMemo(() => {
    if (!startDate || !endDate) return [];

    const entries = data?.entries ?? [];
    const entryMap = new Map(entries.map((e) => [e.capturedDate, e]));

    // Get total from first entry or latest
    const totalPoints = entries[0]?.totalPointsPlanned ?? 0;

    // Generate ideal burn line across business days
    const allDays = eachDayOfInterval({
      start: parseISO(startDate),
      end: parseISO(endDate),
    }).filter((d) => !isWeekend(d));

    if (allDays.length === 0) return [];

    const pointsPerDay = totalPoints / Math.max(allDays.length - 1, 1);

    return allDays.map((day, idx) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const entry = entryMap.get(dateStr);
      const ideal = Math.max(0, totalPoints - pointsPerDay * idx);

      return {
        date: format(day, "MMM d"),
        ideal: Math.round(ideal * 10) / 10,
        actual: entry ? entry.pointsRemaining : null,
      };
    });
  }, [data, startDate, endDate]);

  const hasData = (data?.entries ?? []).length > 0;

  async function handleCapture() {
    try {
      await capture.mutateAsync();
      toast.success("Burndown captured");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to capture");
    }
  }

  if (isLoading) return <Skeleton className="h-64 w-full rounded-lg" />;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-text-secondary">
            Burndown Chart
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCapture}
            disabled={capture.isPending}
          >
            <RefreshCw className={`mr-2 h-3 w-3 ${capture.isPending ? "animate-spin" : ""}`} />
            Capture Today
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!startDate || !endDate ? (
          <p className="py-8 text-center text-sm text-text-muted">
            Sprint dates required for burndown chart.
          </p>
        ) : !hasData ? (
          <div className="py-8 text-center space-y-2">
            <p className="text-sm text-text-muted">No burndown data yet.</p>
            <p className="text-xs text-text-muted">
              Click &quot;Capture Today&quot; to record today&apos;s progress.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="date"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 11 }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
                tickFormatter={(v) => formatPoints(v)}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-text-primary)",
                }}
                labelStyle={{ color: "var(--color-text-primary)" }}
                formatter={(value) =>
                  value == null ? "—" : formatPoints(Number(value))
                }
              />
              <Legend
                wrapperStyle={{ fontSize: "12px", color: "var(--color-text-secondary)" }}
              />
              <Line
                type="monotone"
                dataKey="ideal"
                name="Ideal"
                stroke="var(--color-text-secondary)"
                strokeWidth={1.5}
                strokeDasharray="5 5"
                dot={false}
                connectNulls={false}
              />
              <Line
                type="monotone"
                dataKey="actual"
                name="Actual"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--color-primary)" }}
                activeDot={{ r: 6 }}
                connectNulls={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
