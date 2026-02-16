import { useQuery } from "@tanstack/react-query";
import type { AhaSMTConfig } from "@/lib/config";

export function useConfig() {
  return useQuery<AhaSMTConfig>({
    queryKey: ["config"],
    queryFn: async () => {
      const response = await fetch("/api/config");
      if (!response.ok) {
        throw new Error("Failed to fetch config");
      }
      return response.json();
    },
    staleTime: Infinity, // Config rarely changes during a session
  });
}
