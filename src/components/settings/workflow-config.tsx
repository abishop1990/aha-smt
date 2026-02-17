"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useConfig } from "@/hooks/use-config";
import { useUpdateConfig } from "@/hooks/use-update-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";

const COMMON_MEANINGS = ["DONE", "SHIPPED", "COMPLETE", "RELEASED", "CLOSED"];

export function WorkflowConfig() {
  const { data: config, isLoading } = useConfig();
  const { mutate: updateConfig, isPending } = useUpdateConfig();

  const [completeMeanings, setCompleteMeanings] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    if (config?.workflow.completeMeanings) {
      setCompleteMeanings(config.workflow.completeMeanings);
    }
  }, [config]);

  const handleAddMeaning = (meaning: string) => {
    const normalized = meaning.toUpperCase().trim();
    if (normalized && !completeMeanings.includes(normalized)) {
      const newMeanings = [...completeMeanings, normalized];
      setCompleteMeanings(newMeanings);
      setInputValue("");
    }
  };

  const handleRemoveMeaning = (meaning: string) => {
    setCompleteMeanings(completeMeanings.filter((m) => m !== meaning));
  };

  const handleSave = () => {
    updateConfig({
      workflow: {
        completeMeanings,
      },
    });
  };

  const isDirty = JSON.stringify(completeMeanings) !== JSON.stringify(config?.workflow.completeMeanings ?? []);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow Configuration</CardTitle>
          <CardDescription>
            Configure workflow statuses that indicate a task is complete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Configuration</CardTitle>
        <CardDescription>
          Configure which Aha! workflow statuses indicate a task is complete
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-text-primary block mb-2">
              Complete Workflow Statuses
            </label>
            <p className="text-xs text-text-secondary mb-3">
              Features with these internal status meanings will be marked as complete in reports and dashboards.
            </p>

            {/* Selected meanings */}
            {completeMeanings.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-4 p-3 bg-background rounded-md border border-border">
                {completeMeanings.map((meaning) => (
                  <div
                    key={meaning}
                    className="flex items-center gap-2 bg-primary text-white px-3 py-1 rounded-full text-sm"
                  >
                    <span>{meaning}</span>
                    <button
                      onClick={() => handleRemoveMeaning(meaning)}
                      className="hover:bg-primary/80 rounded p-0.5 transition-colors"
                      aria-label={`Remove ${meaning}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {completeMeanings.length === 0 && (
              <div className="p-3 bg-background rounded-md border border-dashed border-border mb-4">
                <p className="text-xs text-text-muted">No workflow statuses selected yet</p>
              </div>
            )}

            {/* Input field */}
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Enter workflow status (e.g., DONE, SHIPPED)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMeaning(inputValue);
                  }
                }}
                className="flex-1"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddMeaning(inputValue)}
                disabled={!inputValue.trim()}
              >
                Add
              </Button>
            </div>

            {/* Common presets */}
            <div className="space-y-2">
              <p className="text-xs text-text-secondary">Quick select common statuses:</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_MEANINGS.map((meaning) => (
                  <Button
                    key={meaning}
                    variant={completeMeanings.includes(meaning) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      if (completeMeanings.includes(meaning)) {
                        handleRemoveMeaning(meaning);
                      } else {
                        handleAddMeaning(meaning);
                      }
                    }}
                  >
                    {meaning}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex gap-3 pt-4 border-t border-border">
          <Button
            onClick={handleSave}
            disabled={!isDirty || isPending}
          >
            {isPending ? "Saving..." : "Save Configuration"}
          </Button>
          {isDirty && (
            <p className="text-xs text-text-secondary self-center">
              You have unsaved changes
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
