import { getConfigSync } from "./config";

export type CriteriaLevel = "S" | "M" | "L" | "XL";

export interface EstimationCriteria {
  scope: CriteriaLevel;
  complexity: CriteriaLevel;
  unknowns: CriteriaLevel;
}

export function getSuggestedPoints(criteria: EstimationCriteria): number {
  const key = `${criteria.scope}-${criteria.complexity}-${criteria.unknowns}`;
  return getConfigSync().estimation.matrix[key] ?? 5;
}

/** Returns the configured point scale for estimation UI. */
export function getPointScale(): number[] {
  return getConfigSync().points.scale;
}

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/backlog", label: "Backlog", icon: "ListTodo" },
  { href: "/estimate", label: "Estimate", icon: "Calculator" },
  { href: "/sprint", label: "Sprint", icon: "Zap" },
  { href: "/standup", label: "Standup", icon: "Users" },
  { href: "/metrics", label: "Metrics", icon: "BarChart3" },
  { href: "/roadmap", label: "Roadmap", icon: "Map" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;
