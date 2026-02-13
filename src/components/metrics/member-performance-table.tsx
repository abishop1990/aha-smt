"use client";

import { useMemo } from "react";
import type { SprintMetrics } from "@/hooks/use-sprint-metrics";
import { useUsers } from "@/hooks/use-users";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatPoints } from "@/lib/points";

interface MemberPerformanceTableProps {
  snapshots: SprintMetrics[];
}

interface MemberSprintMetric {
  planned: number;
  completed: number;
}

export function MemberPerformanceTable({ snapshots }: MemberPerformanceTableProps) {
  const { data: usersData } = useUsers();
  const activeUserIds = useMemo(
    () => new Set(usersData?.users.map((u) => u.id) ?? []),
    [usersData]
  );

  const { memberNames, sprintColumns, memberData, aggregates } = useMemo(() => {
    const namesMap = new Map<string, string>();

    // Sort snapshots chronologically by start date, then end date
    const sortedSnapshots = [...snapshots].sort((a, b) => {
      const dateA = a.startDate ?? a.endDate ?? "";
      const dateB = b.startDate ?? b.endDate ?? "";
      return dateA.localeCompare(dateB);
    });

    const sprintCols = sortedSnapshots.map((s) => ({
      id: s.id,
      name: s.name,
    }));

    // memberId -> sprintId -> { planned, completed }
    const dataMap = new Map<string, Map<string, MemberSprintMetric>>();

    for (const snapshot of sortedSnapshots) {
      const memberMetrics = snapshot.memberMetrics;

      for (const [memberId, metrics] of Object.entries(memberMetrics)) {
        if (!namesMap.has(memberId)) {
          namesMap.set(memberId, metrics.name);
        }
        if (!dataMap.has(memberId)) {
          dataMap.set(memberId, new Map());
        }
        dataMap.get(memberId)!.set(snapshot.id, {
          planned: metrics.planned,
          completed: metrics.completed,
        });
      }
    }

    // Build aggregate stats per member
    const aggs = new Map<string, { totalPlanned: number; totalCompleted: number }>();
    for (const [memberId, sprintMap] of dataMap) {
      let totalPlanned = 0;
      let totalCompleted = 0;
      for (const metric of sprintMap.values()) {
        totalPlanned += metric.planned;
        totalCompleted += metric.completed;
      }
      aggs.set(memberId, { totalPlanned, totalCompleted });
    }

    return {
      memberNames: namesMap,
      sprintColumns: sprintCols,
      memberData: dataMap,
      aggregates: aggs,
    };
  }, [snapshots]);

  // Filter to only show currently active users
  const memberIds = Array.from(memberNames.keys())
    .filter((memberId) => activeUserIds.has(memberId))
    .sort((a, b) =>
      (memberNames.get(a) ?? "").localeCompare(memberNames.get(b) ?? "")
    );

  if (snapshots.length === 0 || memberIds.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-text-secondary">
            Member Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-text-muted">No performance data available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-text-secondary">
          Member Performance
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Member</TableHead>
              {sprintColumns.map((col) => (
                <TableHead key={col.id} className="text-center">
                  {col.name}
                </TableHead>
              ))}
              <TableHead className="text-center">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {memberIds.map((memberId) => {
              const agg = aggregates.get(memberId);
              return (
                <TableRow key={memberId}>
                  <TableCell className="font-medium">
                    {memberNames.get(memberId)}
                  </TableCell>
                  {sprintColumns.map((col) => {
                    const metric = memberData.get(memberId)?.get(col.id);
                    return (
                      <TableCell key={col.id} className="text-center">
                        {metric ? (
                          <span className="text-text-secondary">
                            <span className="text-text-primary">
                              {formatPoints(metric.completed)}
                            </span>
                            /{formatPoints(metric.planned)}
                          </span>
                        ) : (
                          <span className="text-text-muted">&mdash;</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-medium">
                    <span className="text-text-primary">
                      {formatPoints(agg?.totalCompleted ?? 0)}
                    </span>
                    <span className="text-text-muted">
                      /{formatPoints(agg?.totalPlanned ?? 0)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell className="font-semibold">Team Total</TableCell>
              {sprintColumns.map((col) => {
                // Calculate totals from only active members
                let totalCompleted = 0;
                let totalPlanned = 0;
                for (const memberId of memberIds) {
                  const metric = memberData.get(memberId)?.get(col.id);
                  if (metric) {
                    totalCompleted += metric.completed;
                    totalPlanned += metric.planned;
                  }
                }
                return (
                  <TableCell key={col.id} className="text-center font-medium">
                    <>
                      <span className="text-text-primary">
                        {formatPoints(totalCompleted)}
                      </span>
                      <span className="text-text-muted">
                        /{formatPoints(totalPlanned)}
                      </span>
                    </>
                  </TableCell>
                );
              })}
              <TableCell className="text-center font-semibold">
                <span className="text-text-primary">
                  {formatPoints(
                    Array.from(aggregates.entries())
                      .filter(([id]) => activeUserIds.has(id))
                      .reduce((sum, [, agg]) => sum + agg.totalCompleted, 0)
                  )}
                </span>
                <span className="text-text-muted">
                  /{formatPoints(
                    Array.from(aggregates.entries())
                      .filter(([id]) => activeUserIds.has(id))
                      .reduce((sum, [, agg]) => sum + agg.totalPlanned, 0)
                  )}
                </span>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
