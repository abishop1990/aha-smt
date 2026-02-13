"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTeamMembers } from "@/hooks/use-team-members";

/**
 * Returns team members filtered by standup configuration.
 * If standup_user_ids is configured in settings, only returns those users.
 * Otherwise returns all team members.
 */
export function useStandupMembers() {
  const teamMembers = useTeamMembers();

  const { data: settings } = useQuery<Record<string, string>>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Failed to load settings");
      return res.json();
    },
  });

  const filteredMembers = useMemo(() => {
    const allMembers = teamMembers.data ?? [];
    const standupUserIdsJson = settings?.standup_user_ids;

    if (!standupUserIdsJson) {
      // No filter configured, return all members
      return allMembers;
    }

    try {
      const standupUserIds = JSON.parse(standupUserIdsJson) as string[];
      if (!Array.isArray(standupUserIds) || standupUserIds.length === 0) {
        return allMembers;
      }

      const idSet = new Set(standupUserIds);
      return allMembers.filter((m) => idSet.has(m.id));
    } catch {
      // Invalid JSON, return all members
      return allMembers;
    }
  }, [teamMembers.data, settings]);

  return {
    data: filteredMembers,
    isLoading: teamMembers.isLoading,
    error: teamMembers.error,
  };
}
