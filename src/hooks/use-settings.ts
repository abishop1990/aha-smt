"use client";

import { useQuery } from "@tanstack/react-query";

export function useSettings() {
  return useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
