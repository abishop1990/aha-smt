"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export interface DayOff {
  id: number;
  userId: string | null;
  userName: string | null;
  date: string;
  reason: string;
  isHoliday: boolean;
  createdAt: string;
}

export function useDaysOff(options?: { userId?: string; startDate?: string; endDate?: string }) {
  return useQuery<{ daysOff: DayOff[] }>({
    queryKey: ["days-off", options],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.userId) params.set("userId", options.userId);
      if (options?.startDate) params.set("startDate", options.startDate);
      if (options?.endDate) params.set("endDate", options.endDate);
      const res = await fetch(`/api/days-off?${params}`);
      if (!res.ok) throw new Error("Failed to fetch days off");
      return res.json();
    },
  });
}

export function useCreateDayOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      userId?: string;
      userName?: string;
      date: string;
      reason?: string;
      isHoliday?: boolean;
    }) => {
      const res = await fetch("/api/days-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create day off");
      return res.json();
    },
    onMutate: async (newDayOff) => {
      await queryClient.cancelQueries({ queryKey: ["days-off"] });
      const previous = queryClient.getQueriesData({ queryKey: ["days-off"] });

      // Optimistically add the new day off
      queryClient.setQueriesData(
        { queryKey: ["days-off"] },
        (old: any) => {
          if (!old?.daysOff) return old;
          const optimistic = {
            id: `temp-${Date.now()}` as any,
            userId: newDayOff.userId || null,
            userName: newDayOff.userName || null,
            date: newDayOff.date,
            reason: newDayOff.reason || "",
            isHoliday: newDayOff.isHoliday || false,
            createdAt: new Date().toISOString(),
          };
          return { ...old, daysOff: [...old.daysOff, optimistic] };
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
      queryClient.invalidateQueries({ queryKey: ["days-off"] });
    },
  });
}

export function useDeleteDayOff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/days-off/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete day off");
      return res.json();
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: ["days-off"] });
      const previous = queryClient.getQueriesData({ queryKey: ["days-off"] });

      // Optimistically remove the deleted day off
      queryClient.setQueriesData(
        { queryKey: ["days-off"] },
        (old: any) => {
          if (!old?.daysOff) return old;
          return {
            ...old,
            daysOff: old.daysOff.filter((d: DayOff) => d.id !== deletedId),
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
      queryClient.invalidateQueries({ queryKey: ["days-off"] });
    },
  });
}
