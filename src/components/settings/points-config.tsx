"use client";

import { useState, useEffect } from "react";
import { useConfig } from "@/hooks/use-config";
import { useUpdateConfig } from "@/hooks/use-update-config";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

const POINT_FIELD_OPTIONS = [
  { value: "original_estimate" as const, label: "Original Estimate" },
  { value: "score" as const, label: "Score" },
  { value: "work_units" as const, label: "Work Units" },
];

export function PointsConfig() {
  const { data: config, isLoading } = useConfig();
  const updateMutation = useUpdateConfig();

  // State for point scale editor
  const [scaleInput, setScaleInput] = useState<string>("");
  const [defaultPerDayInput, setDefaultPerDayInput] = useState<string>("");
  const [sourceOrder, setSourceOrder] = useState<Array<"original_estimate" | "score" | "work_units">>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);

  // Initialize from config when it loads
  useEffect(() => {
    if (config) {
      setScaleInput(config.points.scale.join(","));
      setDefaultPerDayInput(String(config.points.defaultPerDay));
      setSourceOrder([...config.points.source]);
    }
  }, [config]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-4 w-32 mb-3" />
          <Skeleton className="h-9 w-full mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div>
          <Skeleton className="h-4 w-40 mb-3" />
          <Skeleton className="h-9 w-full mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div>
          <Skeleton className="h-4 w-36 mb-3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!config) {
    return <p className="text-sm text-text-muted">Failed to load configuration</p>;
  }

  // Parse and validate scale input
  const parseScale = (input: string): number[] => {
    return input
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((s) => parseFloat(s))
      .filter((n) => !isNaN(n))
      .sort((a, b) => a - b);
  };

  const handleSaveScale = () => {
    const parsed = parseScale(scaleInput);
    if (parsed.length === 0) {
      // Show error or revert
      setScaleInput(config.points.scale.join(","));
      return;
    }
    updateMutation.mutate({
      key: "points.scale",
      value: parsed,
    });
  };

  const handleSaveDefaultPerDay = () => {
    const value = parseFloat(defaultPerDayInput);
    if (isNaN(value) || value < 0) {
      setDefaultPerDayInput(String(config.points.defaultPerDay));
      return;
    }
    updateMutation.mutate({
      key: "points.defaultPerDay",
      value: value,
    });
  };

  const handleSaveSourceOrder = () => {
    updateMutation.mutate({
      key: "points.source",
      value: sourceOrder,
    });
  };

  return (
    <div className="space-y-6">
      {/* Point Scale */}
      <div>
        <label className="block text-sm font-medium mb-2">Point Scale</label>
        <p className="text-xs text-text-muted mb-3">
          Comma-separated list of valid point values for estimation (e.g., 1,2,3,5,8,13,21)
        </p>
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              type="text"
              value={scaleInput}
              onChange={(e) => setScaleInput(e.target.value)}
              placeholder="1, 2, 3, 5, 8, 13, 21"
              disabled={updateMutation.isPending}
              className="font-mono text-sm"
            />
          </div>
          <Button
            size="sm"
            onClick={handleSaveScale}
            disabled={updateMutation.isPending || scaleInput === config.points.scale.join(",")}
          >
            Save
          </Button>
        </div>
        <div className="mt-2 text-xs text-text-muted">
          Current: {config.points.scale.join(", ")}
        </div>
      </div>

      {/* Default Points Per Day */}
      <div>
        <label className="block text-sm font-medium mb-2">Default Points Per Day</label>
        <p className="text-xs text-text-muted mb-3">
          Default story points capacity per team member per day
        </p>
        <div className="flex gap-2 items-end max-w-xs">
          <div className="flex-1">
            <Input
              type="number"
              min="0"
              step="0.1"
              value={defaultPerDayInput}
              onChange={(e) => setDefaultPerDayInput(e.target.value)}
              placeholder="1.0"
              disabled={updateMutation.isPending}
            />
          </div>
          <Button
            size="sm"
            onClick={handleSaveDefaultPerDay}
            disabled={updateMutation.isPending || parseFloat(defaultPerDayInput) === config.points.defaultPerDay}
          >
            Save
          </Button>
        </div>
      </div>

      {/* Point Source Priority */}
      <div>
        <label className="block text-sm font-medium mb-2">Point Source Priority</label>
        <p className="text-xs text-text-muted mb-3">
          Drag to reorder. The first non-null value will be used when extracting points from features.
        </p>
        <div className="space-y-2 border border-border rounded-md p-3 bg-surface">
          {sourceOrder.length === 0 ? (
            <p className="text-sm text-text-muted">No sources configured</p>
          ) : (
            sourceOrder.map((field, index) => {
              const option = POINT_FIELD_OPTIONS.find((o) => o.value === field);
              return (
                <div
                  key={`${field}-${index}`}
                  draggable
                  onDragStart={() => setDraggedItem(index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (draggedItem !== null && draggedItem !== index) {
                      const newOrder = [...sourceOrder];
                      const [removed] = newOrder.splice(draggedItem, 1);
                      newOrder.splice(index, 0, removed);
                      setSourceOrder(newOrder);
                    }
                    setDraggedItem(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 p-2 border border-border rounded bg-background cursor-move transition-opacity",
                    draggedItem === index && "opacity-50"
                  )}
                >
                  <GripVertical className="h-4 w-4 text-text-muted flex-shrink-0" />
                  <span className="flex-1 text-sm text-text-primary">
                    {index + 1}. {option?.label || field}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSourceOrder(sourceOrder.filter((_, i) => i !== index));
                    }}
                    disabled={updateMutation.isPending}
                    className="text-text-muted hover:text-danger transition-colors disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Add missing sources */}
        {sourceOrder.length < POINT_FIELD_OPTIONS.length && (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-text-muted">Add source:</p>
            <div className="flex flex-wrap gap-2">
              {POINT_FIELD_OPTIONS.filter((opt) => !sourceOrder.includes(opt.value)).map((option) => (
                <Button
                  key={option.value}
                  variant="outline"
                  size="sm"
                  onClick={() => setSourceOrder([...sourceOrder, option.value])}
                  disabled={updateMutation.isPending}
                >
                  + {option.label}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Save button */}
        {JSON.stringify(sourceOrder) !== JSON.stringify(config.points.source) && (
          <Button
            size="sm"
            onClick={handleSaveSourceOrder}
            disabled={updateMutation.isPending}
            className="mt-3"
          >
            Save Order
          </Button>
        )}
      </div>
    </div>
  );
}
