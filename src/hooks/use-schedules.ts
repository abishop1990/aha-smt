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
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["days-off"] });
    },
  });
}
