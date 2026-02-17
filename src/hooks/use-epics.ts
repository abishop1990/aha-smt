"use client";
import { useQuery } from "@tanstack/react-query";
import type { AhaEpic } from "@/lib/aha-types";

export function useEpics(productId: string | null) {
  return useQuery<{ epics: AhaEpic[] }>({
    queryKey: ["epics", productId],
    queryFn: async () => {
      const res = await fetch(`/api/aha/products/${productId}/epics`);
      if (!res.ok) throw new Error("Failed to fetch epics");
      return res.json();
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}
