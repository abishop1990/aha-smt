"use client";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import { CacheWarmer } from "@/components/shared/cache-warmer";

export interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <SidebarNav />

      <div className="ml-60 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>

      <CacheWarmer />
    </div>
  );
}
