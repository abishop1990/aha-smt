"use client";

import { useQuery } from "@tanstack/react-query";
import type { AhaIteration } from "@/lib/aha-types";

interface IterationsResponse {
  iterations: AhaIteration[];
}

export function useIterations() {
  return useQuery<IterationsResponse>({
    queryKey: ["iterations"],
    queryFn: async () => {
      const res = await fetch("/api/aha/iterations");
      if (!res.ok) throw new Error("Failed to fetch iterations");
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
