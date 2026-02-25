"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { ReleaseSelector } from "@/components/layout/release-selector";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/hooks/use-current-user";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Header() {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await fetch("/api/aha/cache", { method: "POST" });
      await queryClient.invalidateQueries({});
      toast.success("Data refreshed from Aha");
    } catch {
      toast.error("Refresh failed");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <div />

      {/* Right side controls */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          disabled={refreshing}
          title="Refresh data from Aha"
        >
          <RefreshCw className={`h-4 w-4${refreshing ? " animate-spin" : ""}`} />
        </Button>
        <ReleaseSelector />

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
            {user ? getInitials(user.name) : "?"}
          </div>
          <span className="text-sm text-text-secondary">
            {user?.name ?? "Loading..."}
          </span>
        </div>
      </div>
    </header>
  );
}
