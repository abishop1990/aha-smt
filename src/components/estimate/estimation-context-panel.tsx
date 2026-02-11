import { useFeatures } from "@/hooks/use-features";
import { FeatureBadge } from "@/components/shared/feature-badge";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { AhaFeature } from "@/lib/aha-types";
import { getPoints, formatPoints, isUnestimated } from "@/lib/points";
import { useMemo } from "react";

interface EstimationContextPanelProps {
  featureTags: string[];
  releaseId: string;
}

export function EstimationContextPanel({
  featureTags,
  releaseId,
}: EstimationContextPanelProps) {
  const { data, isLoading } = useFeatures(releaseId);

  const similarFeatures = useMemo(() => {
    if (!data?.features || featureTags.length === 0) return [];

    const tagsLower = featureTags.map((t) => t.toLowerCase());

    return data.features.filter((f: AhaFeature) => {
      if (isUnestimated(f)) return false;
      return f.tags?.some((tag) => tagsLower.includes(tag.toLowerCase()));
    });
  }, [data?.features, featureTags]);

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text-secondary">
        Similar Features
      </h3>

      {isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      )}

      {!isLoading && similarFeatures.length === 0 && (
        <p className="text-sm text-text-muted py-4">
          No similar features found
        </p>
      )}

      {!isLoading && similarFeatures.length > 0 && (
        <ul className="space-y-2">
          {similarFeatures.map((feature) => (
            <li
              key={feature.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2.5"
            >
              <div className="min-w-0 flex-1">
                <FeatureBadge
                  referenceNum={feature.reference_num}
                  statusColor={feature.workflow_status?.color}
                />
                <p className="mt-1 truncate text-sm text-text-primary">
                  {feature.name}
                </p>
              </div>
              <Badge variant="default" className="shrink-0">
                {formatPoints(getPoints(feature))} pts
              </Badge>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
