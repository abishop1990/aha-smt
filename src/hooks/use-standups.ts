"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface StandupsResponse {
  entries: StandupEntry[];
}

export interface StandupEntry {
  id: number;
  userId: string;
  userName: string;
  standupDate: string;
  doneSinceLastStandup: string;
  workingOnNow: string;
  blockers: string;
  actionItems: string;
  featureRefs: string;
  createdAt: string;
  updatedAt: string;
}

export function useStandups(date?: string, userId?: string) {
  return useQuery<StandupsResponse>({
    queryKey: ["standups", date, userId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (date) params.set("date", date);
      if (userId) params.set("userId", userId);
      const res = await fetch(`/api/standups?${params}`);
      if (!res.ok) throw new Error("Failed to fetch standups");
      return res.json();
    },
  });
}

export function useCreateStandup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId: string;
      userName: string;
      standupDate: string;
      doneSinceLastStandup: string;
      workingOnNow: string;
      blockers: string;
      actionItems: string;
      featureRefs?: string[];
      blockerItems?: Array<{ description: string; featureRef?: string }>;
      actionItemEntries?: Array<{ description: string; assigneeUserId?: string }>;
    }) => {
      const res = await fetch("/api/standups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create standup");
      return res.json();
    },
    onMutate: async (newStandup) => {
      await queryClient.cancelQueries({ queryKey: ["standups"] });
      const previous = queryClient.getQueriesData({ queryKey: ["standups"] });

      // Optimistically add the new entry
      queryClient.setQueriesData(
        { queryKey: ["standups"] },
        (old: StandupsResponse | undefined) => {
          if (!old?.entries) return old;
          const optimistic: StandupEntry = {
            id: crypto.randomUUID() as any, // Server will replace with actual number ID
            ...newStandup,
            featureRefs: Array.isArray(newStandup.featureRefs)
              ? newStandup.featureRefs.join(",")
              : "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          return { ...old, entries: [optimistic, ...old.entries] };
        }
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["standups"] });
    },
  });
}

export function useUpdateStandup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: number;
      doneSinceLastStandup: string;
      workingOnNow: string;
      blockers: string;
      actionItems: string;
      featureRefs?: string[];
    }) => {
      const { id, ...body } = data;
      const res = await fetch(`/api/standups/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update standup");
      return res.json();
    },
    onMutate: async (updated) => {
      await queryClient.cancelQueries({ queryKey: ["standups"] });
      const previous = queryClient.getQueriesData({ queryKey: ["standups"] });

      queryClient.setQueriesData(
        { queryKey: ["standups"] },
        (old: StandupsResponse | undefined) => {
          if (!old?.entries) return old;
          return {
            ...old,
            entries: old.entries.map((e) =>
              e.id === updated.id
                ? {
                    ...e,
                    ...updated,
                    featureRefs: Array.isArray(updated.featureRefs)
                      ? JSON.stringify(updated.featureRefs)
                      : e.featureRefs,
                    updatedAt: new Date().toISOString(),
                  }
                : e
            ),
          };
        }
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        for (const [key, data] of context.previous) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["standups"] });
    },
  });
}
