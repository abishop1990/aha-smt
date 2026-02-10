"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Calculator,
  Zap,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { usePrefetch } from "@/hooks/use-prefetch";

const ICON_MAP = {
  LayoutDashboard,
  ListTodo,
  Calculator,
  Zap,
  Users,
  BarChart3,
  Settings,
} as const;

export function SidebarNav() {
  const pathname = usePathname();
  const { prefetchReleases } = usePrefetch();

  const handleNavHover = (href: string) => {
    // Prefetch releases for pages that need them
    if (href === "/backlog" || href === "/estimate" || href === "/sprint") {
      prefetchReleases();
    }
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-border bg-surface">
      {/* App logo / name */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <Zap className="h-5 w-5 text-primary" />
        <span className="text-lg font-bold text-text-primary">Aha SMT</span>
      </div>

      {/* Navigation items */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {NAV_ITEMS.map((item) => {
          const Icon = ICON_MAP[item.icon as keyof typeof ICON_MAP];
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onMouseEnter={() => handleNavHover(item.href)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary-muted text-primary"
                  : "text-text-secondary hover:bg-surface hover:text-text-primary"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom branding */}
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-text-muted">Scrum Master Tool</p>
      </div>
    </aside>
  );
}
