"use client";

import { useQuery } from "@tanstack/react-query";
import type { AhaTeam } from "@/lib/aha-types";

interface TeamsResponse {
  teams: AhaTeam[];
}

export function useTeams() {
  return useQuery<TeamsResponse>({
    queryKey: ["teams"],
    queryFn: async () => {
      const res = await fetch("/api/aha/teams");
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes - team data rarely changes
  });
}
