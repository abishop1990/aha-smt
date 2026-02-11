"use client";

import { useQuery } from "@tanstack/react-query";
import type { AhaUser } from "@/lib/aha-types";

export function useCurrentUser() {
  return useQuery<AhaUser>({
    queryKey: ["current-user"],
    queryFn: async () => {
      const res = await fetch("/api/aha/me");
      if (!res.ok) throw new Error("Failed to fetch current user");
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes — user info rarely changes
  });
}
