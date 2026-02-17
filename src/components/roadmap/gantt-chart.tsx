"use client";

import Link from "next/link";
import type { RoadmapItem } from "@/lib/roadmap-utils";
import { itemToBarGeometry, itemStatusColor } from "@/lib/roadmap-utils";

interface GanttChartProps {
  items: RoadmapItem[];
  timelineStart: Date;
  totalDays: number;
  monthTicks: Array<{ label: string; leftPct: number }>;
}

export function GanttChart({ items, timelineStart, totalDays, monthTicks }: GanttChartProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-surface">
      {/* X-axis header */}
      <div className="relative h-8 border-b border-border bg-background" style={{ minWidth: "800px" }}>
        {monthTicks.map((tick) => (
          <span
            key={tick.label}
            style={{ left: `calc(180px + ${tick.leftPct}% * ((100% - 180px) / 100))` }}
            className="absolute top-1.5 text-xs text-text-muted select-none"
          >
            {tick.label}
          </span>
        ))}
      </div>

      {/* Rows */}
      <div style={{ minWidth: "800px" }}>
        {items.map((item) => {
          const geo = itemToBarGeometry(item, timelineStart, totalDays);
          return (
            <div key={item.id} className="relative flex items-center h-11 border-b border-border last:border-b-0">
              {/* Left label gutter */}
              <div className="w-[180px] shrink-0 px-3 z-10 bg-surface">
                <span className="text-xs text-text-secondary truncate block">{item.name}</span>
                <span className="text-[10px] text-text-muted font-mono">{item.reference_num}</span>
              </div>
              {/* Timeline lane */}
              <div className="relative flex-1 h-full">
                {geo && (
                  <Link href={item.href}>
                    <div
                      className="absolute top-2.5 h-6 rounded cursor-pointer transition-opacity hover:opacity-75"
                      style={{
                        left: `${geo.leftPct}%`,
                        width: `${Math.max(geo.widthPct, 0.5)}%`,
                        backgroundColor: itemStatusColor(item.status),
                        minWidth: "4px",
                      }}
                      title={`${item.name}: ${item.startDate} → ${item.endDate}`}
                    >
                      {geo.widthPct > 6 && (
                        <span className="px-1.5 text-[10px] text-white font-medium leading-6 truncate block">
                          {item.name}
                        </span>
                      )}
                    </div>
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
