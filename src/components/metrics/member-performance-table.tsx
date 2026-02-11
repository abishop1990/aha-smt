"use client";

import { useMemo } from "react";
import type { SprintSnapshot } from "@/hooks/use-sprint-snapshots";
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

interface MemberPerformanceTableProps {
  snapshots: SprintSnapshot[];
}

interface MemberSprintMetric {
  planned: number;
  completed: number;
}

interface ParsedMemberMetrics {
  [memberId: string]: {
    name: string;
    planned: number;
    completed: number;
  };
}

export function MemberPerformanceTable({ snapshots }: MemberPerformanceTableProps) {
  const { memberNames, sprintColumns, memberData, aggregates } = useMemo(() => {
    const namesMap = new Map<string, string>();
    const sprintCols = snapshots.map((s) => ({
      id: s.id,
      name: s.releaseName,
    }));

    // memberId -> sprintId -> { planned, completed }
    const dataMap = new Map<string, Map<number, MemberSprintMetric>>();

    for (const snapshot of snapshots) {
      let parsed: ParsedMemberMetrics = {};
      try {
        const raw = JSON.parse(snapshot.memberMetrics);
        // Handle both array (legacy) and object (current) formats
        if (Array.isArray(raw)) {
          for (const entry of raw) {
            parsed[entry.userId] = { name: entry.name, planned: entry.planned, completed: entry.completed };
          }
        } else {
          parsed = raw as ParsedMemberMetrics;
        }
      } catch {
        continue;
      }

      for (const [memberId, metrics] of Object.entries(parsed)) {
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

  const memberIds = Array.from(memberNames.keys()).sort((a, b) =>
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
                              {metric.completed}
                            </span>
                            /{metric.planned}
                          </span>
                        ) : (
                          <span className="text-text-muted">&mdash;</span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="text-center font-medium">
                    <span className="text-text-primary">
                      {agg?.totalCompleted ?? 0}
                    </span>
                    <span className="text-text-muted">
                      /{agg?.totalPlanned ?? 0}
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
                const snapshot = snapshots.find((s) => s.id === col.id);
                return (
                  <TableCell key={col.id} className="text-center font-medium">
                    {snapshot ? (
                      <>
                        <span className="text-text-primary">
                          {snapshot.totalPointsCompleted}
                        </span>
                        <span className="text-text-muted">
                          /{snapshot.totalPointsPlanned}
                        </span>
                      </>
                    ) : (
                      <span className="text-text-muted">&mdash;</span>
                    )}
                  </TableCell>
                );
              })}
              <TableCell className="text-center font-semibold">
                <span className="text-text-primary">
                  {snapshots.reduce((s, snap) => s + snap.totalPointsCompleted, 0)}
                </span>
                <span className="text-text-muted">
                  /{snapshots.reduce((s, snap) => s + snap.totalPointsPlanned, 0)}
                </span>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </CardContent>
    </Card>
  );
}
