"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { AhaSMTConfig } from "@/lib/config";

type UpdatePayload =
  | Partial<AhaSMTConfig>  // For nested updates (e.g., { estimation: { matrix: {...} } })
  | { key: string; value: unknown };  // For simple key-value updates (e.g., { key: "backlog.filterType", value: "release" })

function isKeyValueUpdate(payload: UpdatePayload): payload is { key: string; value: unknown } {
  return "key" in payload && "value" in payload;
}

function keyValueToNestedConfig(key: string, value: unknown): Partial<AhaSMTConfig> {
  const parts = key.split(".");
  const result: any = {};
  let current = result;

  for (let i = 0; i < parts.length - 1; i++) {
    current[parts[i]] = {};
    current = current[parts[i]];
  }

  current[parts[parts.length - 1]] = value;
  return result;
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdatePayload) => {
      // Convert key-value format to nested config format if needed
      const configUpdate = isKeyValueUpdate(payload)
        ? keyValueToNestedConfig(payload.key, payload.value)
        : payload;

      const response = await fetch("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(configUpdate),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update config");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["config"] });
      toast.success("Configuration updated");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : "Failed to update configuration";
      toast.error(message);
    },
  });
}
