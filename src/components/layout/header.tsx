"use client";

import { ReleaseSelector } from "@/components/layout/release-selector";

export function Header() {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-surface px-6">
      <div />

      {/* Right side controls */}
      <div className="flex items-center gap-4">
        <ReleaseSelector />

        {/* User avatar / name placeholder */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-medium text-white">
            U
          </div>
          <span className="text-sm text-text-secondary">User</span>
        </div>
      </div>
    </header>
  );
}
