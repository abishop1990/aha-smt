"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type Column } from "@/components/shared/data-table";
import { FeatureBadge } from "@/components/shared/feature-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AhaFeature } from "@/lib/aha-types";

interface BacklogTableProps {
  features: AhaFeature[] | undefined;
  isLoading: boolean;
  assigneeFilter: string;
  tagFilter: string;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function BacklogTable({
  features: featuresProp,
  isLoading,
  assigneeFilter,
  tagFilter,
}: BacklogTableProps) {
  const router = useRouter();

  const filteredFeatures = useMemo(() => {
    let features = featuresProp ?? [];

    if (assigneeFilter) {
      const filter = assigneeFilter.toLowerCase();
      features = features.filter((f) =>
        f.assigned_to_user?.name?.toLowerCase().includes(filter)
      );
    }

    if (tagFilter) {
      const filter = tagFilter.toLowerCase();
      features = features.filter((f) =>
        f.tags?.some((tag) => tag.toLowerCase().includes(filter))
      );
    }

    return features;
  }, [featuresProp, assigneeFilter, tagFilter]);

  const columns: Column<AhaFeature>[] = useMemo(
    () => [
      {
        key: "ref",
        header: "Ref#",
        render: (feature) => (
          <FeatureBadge
            referenceNum={feature.reference_num}
            statusColor={feature.workflow_status?.color}
          />
        ),
      },
      {
        key: "name",
        header: "Name",
        render: (feature) => (
          <span className="font-medium">{feature.name}</span>
        ),
      },
      {
        key: "status",
        header: "Status",
        render: (feature) =>
          feature.workflow_status ? (
            <span
              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border border-border text-text-secondary"
              style={{
                backgroundColor: feature.workflow_status.color
                  ? `${feature.workflow_status.color}20`
                  : undefined,
              }}
            >
              {feature.workflow_status.name}
            </span>
          ) : null,
      },
      {
        key: "assignee",
        header: "Assignee",
        render: (feature) => (
          <span className="text-text-secondary">
            {feature.assigned_to_user?.name ?? "\u2014"}
          </span>
        ),
      },
      {
        key: "tags",
        header: "Tags",
        render: (feature) => (
          <div className="flex flex-wrap gap-1">
            {feature.tags?.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        ),
      },
      {
        key: "created",
        header: "Created",
        render: (feature) => (
          <span className="text-text-muted text-xs whitespace-nowrap">
            {formatDate(feature.created_at)}
          </span>
        ),
      },
      {
        key: "actions",
        header: "",
        className: "text-right",
        render: (feature) => (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/estimate?featureId=${feature.id}`);
            }}
          >
            Estimate
          </Button>
        ),
      },
    ],
    [router]
  );

  return (
    <DataTable
      columns={columns}
      data={filteredFeatures}
      isLoading={isLoading}
      emptyMessage="No unestimated features"
      emptyDescription="All features have been estimated."
      getRowKey={(feature) => feature.id}
    />
  );
}
