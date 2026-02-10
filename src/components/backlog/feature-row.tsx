"use client";

import type { AhaFeature } from "@/lib/aha-types";
import { FeatureBadge } from "@/components/shared/feature-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableRow, TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { usePrefetch } from "@/hooks/use-prefetch";

interface FeatureRowProps {
  feature: AhaFeature;
  onEstimate: (feature: AhaFeature) => void;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FeatureRow({ feature, onEstimate }: FeatureRowProps) {
  const { prefetchFeature } = usePrefetch();

  return (
    <TableRow onMouseEnter={() => prefetchFeature(feature.id)}>
      <TableCell>
        <FeatureBadge
          referenceNum={feature.reference_num}
          statusColor={feature.workflow_status?.color}
        />
      </TableCell>
      <TableCell className="font-medium">{feature.name}</TableCell>
      <TableCell>
        {feature.workflow_status && (
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              "border border-border text-text-secondary"
            )}
            style={{
              backgroundColor: feature.workflow_status.color
                ? `${feature.workflow_status.color}20`
                : undefined,
            }}
          >
            {feature.workflow_status.name}
          </span>
        )}
      </TableCell>
      <TableCell className="text-text-secondary">
        {feature.assigned_to_user?.name ?? "\u2014"}
      </TableCell>
      <TableCell>
        <div className="flex flex-wrap gap-1">
          {feature.tags?.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </TableCell>
      <TableCell className="text-text-muted text-xs whitespace-nowrap">
        {formatDate(feature.created_at)}
      </TableCell>
      <TableCell className="text-right">
        <Button size="sm" onClick={() => onEstimate(feature)}>
          Estimate
        </Button>
      </TableCell>
    </TableRow>
  );
}
