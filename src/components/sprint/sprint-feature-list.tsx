"use client";

import { useMemo } from "react";
import type { AhaFeature } from "@/lib/aha-types";
import { FeatureBadge } from "@/components/shared/feature-badge";
import { Badge } from "@/components/ui/badge";
import { usePrefetch } from "@/hooks/use-prefetch";

interface SprintFeatureListProps {
  features: AhaFeature[];
}

interface AssigneeGroup {
  name: string;
  totalPoints: number;
  features: AhaFeature[];
}

export function SprintFeatureList({ features }: SprintFeatureListProps) {
  const { prefetchFeature } = usePrefetch();
  const groups = useMemo<AssigneeGroup[]>(() => {
    const map = new Map<string, AhaFeature[]>();

    for (const feature of features) {
      const name = feature.assigned_to_user?.name ?? "Unassigned";
      const list = map.get(name) ?? [];
      list.push(feature);
      map.set(name, list);
    }

    return Array.from(map.entries())
      .map(([name, feats]) => ({
        name,
        totalPoints: feats.reduce((sum, f) => sum + (f.score ?? 0), 0),
        features: feats,
      }))
      .sort((a, b) => {
        if (a.name === "Unassigned") return 1;
        if (b.name === "Unassigned") return -1;
        return a.name.localeCompare(b.name);
      });
  }, [features]);

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <div key={group.name}>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-text-primary">
              {group.name}
            </h3>
            <Badge variant="secondary">
              {group.totalPoints} pt{group.totalPoints !== 1 ? "s" : ""}
            </Badge>
          </div>

          <ul className="space-y-1">
            {group.features.map((feature) => (
              <li
                key={feature.id}
                className="flex items-center gap-3 rounded-md border border-border bg-surface px-3 py-2"
                onMouseEnter={() => prefetchFeature(feature.id)}
              >
                <FeatureBadge
                  referenceNum={feature.reference_num}
                  statusName={feature.workflow_status?.name}
                  statusColor={feature.workflow_status?.color}
                />

                <span className="flex-1 truncate text-sm text-text-primary">
                  {feature.name}
                </span>

                {feature.score != null && (
                  <Badge variant="outline" className="shrink-0">
                    {feature.score} pt{feature.score !== 1 ? "s" : ""}
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}

      {features.length === 0 && (
        <p className="text-sm text-text-muted">No features in this sprint.</p>
      )}
    </div>
  );
}
