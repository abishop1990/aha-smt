"use client";

import { ReleaseSelector } from "@/components/layout/release-selector";
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

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <div />

      {/* Right side controls */}
      <div className="flex items-center gap-4">
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
