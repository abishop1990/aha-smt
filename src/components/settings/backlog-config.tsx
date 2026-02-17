"use client";

import { useState, useEffect } from "react";
import { useConfig } from "@/hooks/use-config";
import { useUpdateConfig } from "@/hooks/use-update-config";
import { Input } from "@/components/ui/input";
import { MultiSelect } from "@/components/ui/multi-select";
import { Skeleton } from "@/components/ui/skeleton";

const WORKFLOW_KIND_OPTIONS = ["Bug", "Test", "Spike", "Chore"];
const FILTER_TYPE_OPTIONS = [
  { value: "release", label: "By Release (default)" },
  { value: "team_location", label: "By Team Location (Aha Develop)" },
  { value: "epic", label: "By Epic" },
  { value: "tag", label: "By Tag" },
  { value: "custom_field", label: "By Custom Field (future)" },
];

export function BacklogConfig() {
  const { data: config, isLoading } = useConfig();
  const { mutate: updateConfig, isPending } = useUpdateConfig();

  const [filterType, setFilterType] = useState<string>("release");
  const [teamProductId, setTeamProductId] = useState<string>("");
  const [tagFilter, setTagFilter] = useState<string>("");
  const [epicId, setEpicId] = useState<string>("");
  const [excludeWorkflowKinds, setExcludeWorkflowKinds] = useState<string[]>([]);

  useEffect(() => {
    if (config?.backlog) {
      setFilterType(config.backlog.filterType);
      setTeamProductId(config.backlog.teamProductId ?? "");
      setTagFilter(config.backlog.tagFilter ?? "");
      setEpicId(config.backlog.epicId ?? "");
      setExcludeWorkflowKinds(config.backlog.excludeWorkflowKinds ?? []);
    }
  }, [config]);

  const handleFilterTypeChange = (newFilterType: string) => {
    setFilterType(newFilterType);
    updateConfig({
      backlog: {
        filterType: newFilterType as "release" | "team_location" | "epic" | "tag" | "custom_field",
        teamProductId: newFilterType === "team_location" ? teamProductId : undefined,
        tagFilter: newFilterType === "tag" ? tagFilter : undefined,
        epicId: newFilterType === "epic" ? epicId : undefined,
        excludeWorkflowKinds,
      },
    });
  };

  const handleTeamProductIdChange = (newId: string) => {
    setTeamProductId(newId);
    updateConfig({
      backlog: {
        filterType: filterType as "release" | "team_location" | "epic" | "tag" | "custom_field",
        teamProductId: newId,
        excludeWorkflowKinds,
      },
    });
  };

  const handleTagFilterChange = (newTag: string) => {
    setTagFilter(newTag);
    updateConfig({
      backlog: {
        filterType: filterType as "release" | "team_location" | "epic" | "tag" | "custom_field",
        tagFilter: newTag,
        excludeWorkflowKinds,
      },
    });
  };

  const handleEpicIdChange = (newEpicId: string) => {
    setEpicId(newEpicId);
    updateConfig({
      backlog: {
        filterType: filterType as "release" | "team_location" | "epic" | "tag" | "custom_field",
        epicId: newEpicId,
        excludeWorkflowKinds,
      },
    });
  };

  const handleExcludeWorkflowKindsChange = (selected: string[]) => {
    setExcludeWorkflowKinds(selected);
    updateConfig({
      backlog: {
        filterType: filterType as "release" | "team_location" | "epic" | "tag" | "custom_field",
        teamProductId: filterType === "team_location" ? teamProductId : undefined,
        tagFilter: filterType === "tag" ? tagFilter : undefined,
        epicId: filterType === "epic" ? epicId : undefined,
        excludeWorkflowKinds: selected,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-9 w-full" />
        </div>
        <div>
          <Skeleton className="h-4 w-40 mb-3" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    );
  }

  if (!config) {
    return <p className="text-sm text-text-muted">Failed to load configuration</p>;
  }

  return (
    <div className="space-y-6">
      {/* Filter Type */}
      <div>
        <label className="block text-sm font-medium mb-2">Filter Type</label>
        <p className="text-xs text-text-muted mb-3">
          How to filter features in estimation/backlog views
        </p>
        <select
          value={filterType}
          onChange={(e) => handleFilterTypeChange(e.target.value)}
          disabled={isPending}
          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {FILTER_TYPE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Team Location Product ID (conditional) */}
      {filterType === "team_location" && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Develop Product ID
          </label>
          <p className="text-xs text-text-muted mb-3">
            Find this in your Aha URL when viewing your Develop product
          </p>
          <input
            type="text"
            value={teamProductId}
            onChange={(e) => handleTeamProductIdChange(e.target.value)}
            disabled={isPending}
            placeholder="e.g., 7504415798145038653"
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      )}

      {/* Tag filter (conditional) */}
      {filterType === "tag" && (
        <div>
          <label className="block text-sm font-medium mb-2">Tag Name</label>
          <p className="text-xs text-text-muted mb-2">Filter features by this tag (case-insensitive)</p>
          <Input
            value={tagFilter}
            onChange={(e) => handleTagFilterChange(e.target.value)}
            disabled={isPending}
            placeholder="e.g. frontend"
            className="max-w-xs"
          />
        </div>
      )}

      {/* Epic filter (conditional) */}
      {filterType === "epic" && (
        <div>
          <label className="block text-sm font-medium mb-2">Epic Reference</label>
          <p className="text-xs text-text-muted mb-2">The epic reference number (e.g. PRJ-E-1)</p>
          <Input
            value={epicId}
            onChange={(e) => handleEpicIdChange(e.target.value)}
            disabled={isPending}
            placeholder="e.g. PRJ-E-1"
            className="max-w-xs"
          />
        </div>
      )}

      {/* Exclude Workflow Kinds */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Exclude Workflow Kinds
        </label>
        <p className="text-xs text-text-muted mb-3">
          These won&apos;t appear in estimation queue
        </p>
        <MultiSelect
          options={WORKFLOW_KIND_OPTIONS}
          selected={excludeWorkflowKinds}
          onChange={handleExcludeWorkflowKindsChange}
          disabled={isPending}
          placeholder="Select workflow kinds to exclude..."
        />
      </div>
    </div>
  );
}
