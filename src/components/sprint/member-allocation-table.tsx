"use client";

import { useMemo } from "react";
import type { AhaFeature } from "@/lib/aha-types";
import { DataTable, type Column } from "@/components/shared/data-table";
import { CapacityBar } from "./capacity-bar";
import { cn } from "@/lib/utils";

interface MemberCapacity {
  name: string;
  capacity: number;
  pointsPerDay: number;
  daysOff: number;
}

interface MemberAllocationTableProps {
  features: AhaFeature[];
  memberCapacities: Record<string, MemberCapacity>;
}

interface MemberRow {
  userId: string;
  name: string;
  capacity: number;
  allocated: number;
  delta: number;
}

export function MemberAllocationTable({
  features,
  memberCapacities,
}: MemberAllocationTableProps) {
  const rows = useMemo<MemberRow[]>(() => {
    const allocationMap: Record<string, number> = {};

    for (const feature of features) {
      const userId = feature.assigned_to_user?.id;
      if (userId) {
        allocationMap[userId] = (allocationMap[userId] ?? 0) + (feature.score ?? 0);
      }
    }

    return Object.entries(memberCapacities).map(([userId, mc]) => {
      const allocated = allocationMap[userId] ?? 0;
      return {
        userId,
        name: mc.name,
        capacity: mc.capacity,
        allocated,
        delta: mc.capacity - allocated,
      };
    });
  }, [features, memberCapacities]);

  const columns: Column<MemberRow>[] = [
    {
      key: "name",
      header: "Member",
      render: (row) => (
        <span className="font-medium text-text-primary">{row.name}</span>
      ),
    },
    {
      key: "capacity",
      header: "Capacity (pts)",
      className: "text-right",
      render: (row) => <span className="text-text-secondary">{row.capacity}</span>,
    },
    {
      key: "allocated",
      header: "Allocated (pts)",
      className: "text-right",
      render: (row) => <span className="text-text-primary">{row.allocated}</span>,
    },
    {
      key: "delta",
      header: "Delta",
      className: "text-right",
      render: (row) => (
        <span
          className={cn(
            "font-medium",
            row.delta >= 0 ? "text-success" : "text-danger"
          )}
        >
          {row.delta >= 0 ? "+" : ""}
          {row.delta}
        </span>
      ),
    },
    {
      key: "bar",
      header: "Capacity",
      className: "min-w-[200px]",
      render: (row) => (
        <CapacityBar
          capacity={row.capacity}
          allocated={row.allocated}
          label=""
        />
      ),
    },
  ];

  return (
    <DataTable<MemberRow>
      columns={columns}
      data={rows}
      getRowKey={(row) => row.userId}
      emptyMessage="No team members"
      emptyDescription="Add team member capacities to see allocation data."
    />
  );
}
