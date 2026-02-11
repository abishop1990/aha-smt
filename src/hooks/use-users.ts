"use client";

import { useQuery } from "@tanstack/react-query";
import type { AhaUser } from "@/lib/aha-types";

interface UsersResponse {
  users: AhaUser[];
}

export function useUsers() {
  return useQuery<UsersResponse>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/aha/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
