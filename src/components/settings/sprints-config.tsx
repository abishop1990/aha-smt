"use client";

import { useConfig } from "@/hooks/use-config";
import { useUpdateConfig } from "@/hooks/use-update-config";
import { Skeleton } from "@/components/ui/skeleton";

const SPRINT_MODE_OPTIONS = [
  { value: "iterations", label: "Iterations only" },
  { value: "releases", label: "Releases only" },
  { value: "both", label: "Both (iterations & releases)" },
];

const DEFAULT_VIEW_OPTIONS = [
  { value: "iterations", label: "Iterations" },
  { value: "releases", label: "Releases" },
];

export function SprintsConfig() {
  const { data: config, isLoading } = useConfig();
  const updateMutation = useUpdateConfig();

  if (isLoading) {
    return (
      <div className="space-y-6">
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
      {/* Sprint Tracking Mode */}
      <div>
        <label className="block text-sm font-medium mb-2">
          Sprint Tracking Mode
        </label>
        <p className="text-xs text-text-muted mb-3">
          Choose which sprint tracking approach to use
        </p>
        <select
          value={config.sprints.mode}
          onChange={(e) =>
            updateMutation.mutate({
              key: "sprints.mode",
              value: e.target.value,
            })
          }
          disabled={updateMutation.isPending}
          className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {SPRINT_MODE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Default View (only shown when mode is "both") */}
      {config.sprints.mode === "both" && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Default View
          </label>
          <p className="text-xs text-text-muted mb-3">
            Which tab opens first when mode is set to both
          </p>
          <select
            value={config.sprints.defaultView}
            onChange={(e) =>
              updateMutation.mutate({
                key: "sprints.defaultView",
                value: e.target.value,
              })
            }
            disabled={updateMutation.isPending}
            className="w-full px-3 py-2 bg-background border border-border rounded text-sm text-text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {DEFAULT_VIEW_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
