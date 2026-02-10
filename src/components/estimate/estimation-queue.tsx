"use client";

import type { AhaFeature } from "@/lib/aha-types";
import { cn } from "@/lib/utils";
import { usePrefetch } from "@/hooks/use-prefetch";
import { isUnestimated } from "@/lib/points";

interface EstimationQueueProps {
  features: AhaFeature[];
  currentIndex: number;
  onSelect: (index: number) => void;
  estimatedIds?: Set<string>;
}

export function EstimationQueue({
  features,
  currentIndex,
  onSelect,
  estimatedIds,
}: EstimationQueueProps) {
  const { prefetchFeature } = usePrefetch();
  const estimatedCount = estimatedIds?.size ?? features.filter((f) => !isUnestimated(f)).length;
  const total = features.length;
  const progressPercent = total > 0 ? (estimatedCount / total) * 100 : 0;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-4">
        <p className="text-sm font-medium text-text-primary">
          {estimatedCount} of {total} estimated
        </p>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {features.map((feature, index) => (
          <button
            key={feature.id}
            type="button"
            onClick={() => onSelect(index)}
            onMouseEnter={() => prefetchFeature(feature.id)}
            className={cn(
              "flex w-full flex-col gap-0.5 border-b border-border px-4 py-3 text-left transition-colors",
              "hover:bg-surface",
              index === currentIndex && "bg-primary-muted"
            )}
          >
            <span className="text-xs font-mono text-text-muted">
              {feature.reference_num}
            </span>
            <span
              className={cn(
                "text-sm leading-snug",
                index === currentIndex
                  ? "text-text-primary font-medium"
                  : "text-text-secondary"
              )}
            >
              {feature.name}
            </span>
            {(!isUnestimated(feature) || estimatedIds?.has(feature.id)) && (
              <span className="mt-0.5 text-xs text-success">
                Estimated
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
