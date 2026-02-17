"use client";

import { useConfig } from "@/hooks/use-config";
import { useUpdateConfig } from "@/hooks/use-update-config";
import { cn } from "@/lib/utils";

export function EstimationMatrixEditor() {
  const { data: config } = useConfig();
  const { mutate: updateConfig } = useUpdateConfig();
  const matrix = config?.estimation.matrix ?? {};

  const dimensions = {
    scope: ["L", "M", "H"],
    complexity: ["L", "M", "H"],
    unknowns: ["L", "M", "H"],
  };

  const scopeLabels: Record<string, string> = {
    L: "Low",
    M: "Medium",
    H: "High",
  };

  function updateMatrix(key: string, value: number) {
    const updatedMatrix = { ...matrix, [key]: value };
    updateConfig({
      estimation: {
        ...config?.estimation,
        matrix: updatedMatrix,
      },
    });
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-text-muted">
        Set point values for each combination of Scope, Complexity, and Unknowns
      </p>

      {dimensions.scope.map((scope) => (
        <div key={scope} className="border border-border rounded-lg p-4">
          <h4 className="font-medium mb-4 text-text-primary">
            Scope: {scopeLabels[scope]}
          </h4>

          <div className="grid grid-cols-3 gap-4">
            {dimensions.complexity.map((complexity) =>
              dimensions.unknowns.map((unknowns) => {
                const key = `${scope}-${complexity}-${unknowns}`;
                const currentValue = matrix[key];

                return (
                  <div key={key} className="flex flex-col">
                    <label className="text-xs text-text-muted mb-2 font-medium">
                      C:{complexity} / U:{unknowns}
                    </label>
                    <input
                      type="number"
                      value={currentValue ?? ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === "") {
                          // Allow clearing the value
                          updateMatrix(key, NaN);
                        } else {
                          const parsed = parseInt(val, 10);
                          if (!isNaN(parsed) && parsed > 0) {
                            updateMatrix(key, parsed);
                          }
                        }
                      }}
                      placeholder="0"
                      className={cn(
                        "px-3 py-2 bg-surface border border-border rounded text-sm",
                        "text-text-primary placeholder-text-muted",
                        "focus:outline-none focus:ring-2 focus:ring-primary",
                        "transition-colors"
                      )}
                      min="1"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
