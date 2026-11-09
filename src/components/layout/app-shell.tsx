"use client";

import { useSyncExternalStore } from "react";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Header } from "@/components/layout/header";
import { NavigationProgress } from "@/components/layout/navigation-progress";
import Loading from "@/app/loading";

export interface AppShellProps {
  children: React.ReactNode;
}

const noopSubscribe = () => () => {};

/**
 * Pages render only after hydration. Every page fetches its data in the browser, and a page's
 * chunk can hydrate after the shell's own queries have already resolved, so a server-rendered page
 * would hydrate against different data and React would throw away the tree.
 */
function useHydrated() {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function AppShell({ children }: AppShellProps) {
  const hydrated = useHydrated();

  return (
    <div className="min-h-screen bg-background">
      <NavigationProgress />
      <SidebarNav />

      <div className="ml-60 flex min-h-screen flex-col">
        <Header />

        <main className="flex-1 overflow-y-auto p-6">{hydrated ? children : <Loading />}</main>
      </div>
    </div>
  );
}
