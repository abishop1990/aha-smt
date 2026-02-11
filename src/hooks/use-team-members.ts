"use client";

import { useMemo } from "react";
import { useTeams } from "@/hooks/use-teams";
import { useUsers } from "@/hooks/use-users";

export interface TeamMember {
  id: string;
  name: string;
}

export function useTeamMembers() {
  const teams = useTeams();
  const users = useUsers();

  const data = useMemo<TeamMember[]>(() => {
    // Try teams first — extract unique users from team_members
    if (teams.data?.teams && teams.data.teams.length > 0) {
      const seen = new Map<string, string>();
      for (const team of teams.data.teams) {
        for (const tm of team.team_members ?? []) {
          if (!seen.has(tm.user.id)) {
            seen.set(tm.user.id, tm.user.name);
          }
        }
      }
      if (seen.size > 0) {
        return Array.from(seen, ([id, name]) => ({ id, name }));
      }
    }

    // Fall back to product users
    if (users.data?.users) {
      return users.data.users.map((u) => ({ id: u.id, name: u.name }));
    }

    return [];
  }, [teams.data, users.data]);

  return {
    data,
    isLoading: teams.isLoading || users.isLoading,
    error: teams.error && users.error ? users.error : null,
  };
}
