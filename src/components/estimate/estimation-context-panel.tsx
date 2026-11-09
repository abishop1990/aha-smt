"use client";

import { useMemo } from "react";
import { useFeaturesByEpic } from "@/hooks/use-features-by-epic";
import { useEstimationHistoryForCriteria } from "@/hooks/use-estimation-history";
import { summarizeEstimationHistory } from "@/lib/estimation-calibration";
import { FeatureBadge } from "@/components/shared/feature-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { EstimationCriteria } from "@/lib/constants";
import { getPoints, formatPoints, isUnestimated } from "@/lib/points";

const MAX_EPIC_SIBLINGS = 8;

interface EstimationContextPanelProps {
  featureId: string;
  epic: { reference_num: string; name: string } | null | undefined;
  criteria: EstimationCriteria;
}

/** Calibration aids: how similar work was sized before. */
export function EstimationContextPanel({ featureId, epic, criteria }: EstimationContextPanelProps) {
  return (
    <div className="space-y-6">
      <PastCallsSection criteria={criteria} />
      <EpicSiblingsSection featureId={featureId} epic={epic} />
    </div>
  );
}

function PastCallsSection({ criteria }: { criteria: EstimationCriteria }) {
  const { data, isLoading } = useEstimationHistoryForCriteria(criteria);
  const summary = useMemo(() => summarizeEstimationHistory(data?.history ?? []), [data]);
  const label = `${criteria.scope} / ${criteria.complexity} / ${criteria.unknowns}`;

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-text-secondary">Past calls at {label}</h3>
      {isLoading ? (
        <Skeleton className="h-10 w-full" />
      ) : summary.count === 0 ? (
        <p className="text-xs text-text-muted">
          No features estimated here with these ratings yet.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {summary.distribution.map(({ points, count }) => (
              <Badge key={points} variant="outline">
                {formatPoints(points)} pts × {count}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-text-muted">
            {summary.count} past {summary.count === 1 ? "estimate" : "estimates"}; suggestion
            overridden {Math.round(summary.overrideRate * 100)}% of the time.
          </p>
        </div>
      )}
    </section>
  );
}

function EpicSiblingsSection({
  featureId,
  epic,
}: {
  featureId: string;
  epic: EstimationContextPanelProps["epic"];
}) {
  const { data, isLoading } = useFeaturesByEpic(epic?.reference_num ?? null);

  const siblings = useMemo(
    () =>
      (data?.features ?? [])
        .filter((f) => f.id !== featureId && !isUnestimated(f))
        .sort((a, b) => getPoints(b) - getPoints(a)),
    [data, featureId]
  );

  if (!epic) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-text-secondary">Same epic</h3>
        <p className="text-xs text-text-muted">This feature isn&apos;t in an epic.</p>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-medium text-text-secondary" title={epic.name}>
        Estimated in {epic.reference_num}
      </h3>
      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : siblings.length === 0 ? (
        <p className="text-xs text-text-muted">No other estimated features in this epic.</p>
      ) : (
        <ul className="space-y-2">
          {siblings.slice(0, MAX_EPIC_SIBLINGS).map((feature) => (
            <li
              key={feature.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2.5"
            >
              <div className="min-w-0 flex-1">
                <FeatureBadge
                  referenceNum={feature.reference_num}
                  statusColor={feature.workflow_status?.color}
                />
                <p className="mt-1 truncate text-sm text-text-primary" title={feature.name}>
                  {feature.name}
                </p>
              </div>
              <Badge variant="default" className="shrink-0">
                {formatPoints(getPoints(feature))} pts
              </Badge>
            </li>
          ))}
          {siblings.length > MAX_EPIC_SIBLINGS && (
            <li className="text-xs text-text-muted">
              +{siblings.length - MAX_EPIC_SIBLINGS} more
            </li>
          )}
        </ul>
      )}
    </section>
  );
}
