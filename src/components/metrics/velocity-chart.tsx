"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { SprintMetrics } from "@/hooks/use-sprint-metrics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatPoints } from "@/lib/points";

interface VelocityChartProps {
  snapshots: SprintMetrics[];
}

export function VelocityChart({ snapshots }: VelocityChartProps) {
  const data = [...snapshots]
    .sort((a, b) => {
      const dateA = a.startDate ?? a.endDate ?? "";
      const dateB = b.startDate ?? b.endDate ?? "";
      return dateA.localeCompare(dateB);
    })
    .map((s) => ({
      name: s.name,
      planned: s.totalPointsPlanned,
      completed: s.totalPointsCompleted,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-text-secondary">
          Velocity Over Time
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-8 text-center text-sm text-text-muted">
            No sprint data available yet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
              />
              <XAxis
                dataKey="name"
                tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
                axisLine={{ stroke: "var(--color-border)" }}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "var(--color-surface)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  color: "var(--color-text-primary)",
                }}
                labelStyle={{ color: "var(--color-text-primary)" }}
                formatter={(value: number) => formatPoints(value)}
              />
              <Line
                type="monotone"
                dataKey="planned"
                name="Planned"
                stroke="var(--color-text-secondary)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--color-text-secondary)" }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke="var(--color-primary)"
                strokeWidth={2}
                dot={{ r: 4, fill: "var(--color-primary)" }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
