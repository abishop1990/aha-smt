export const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21] as const;
export type FibonacciPoint = (typeof FIBONACCI_POINTS)[number];

export type CriteriaLevel = "L" | "M" | "H";

export interface EstimationCriteria {
  scope: CriteriaLevel;
  complexity: CriteriaLevel;
  unknowns: CriteriaLevel;
}

// Three-criteria estimation model lookup table
const ESTIMATION_MATRIX: Record<string, number> = {
  "L-L-L": 1,
  "L-L-M": 2,
  "L-M-L": 2,
  "M-L-L": 3,
  "L-L-H": 3,
  "L-M-M": 3,
  "L-H-L": 3,
  "M-L-M": 5,
  "M-M-L": 5,
  "L-M-H": 5,
  "L-H-M": 5,
  "M-L-H": 5,
  "M-M-M": 8,
  "H-L-L": 5,
  "H-L-M": 8,
  "H-M-L": 8,
  "M-H-L": 8,
  "M-M-H": 8,
  "H-L-H": 13,
  "H-M-M": 13,
  "M-H-M": 13,
  "L-H-H": 8,
  "H-M-H": 13,
  "M-H-H": 13,
  "H-H-L": 13,
  "H-H-M": 21,
  "H-H-H": 21,
};

export function getSuggestedPoints(criteria: EstimationCriteria): number {
  const key = `${criteria.scope}-${criteria.complexity}-${criteria.unknowns}`;
  return ESTIMATION_MATRIX[key] ?? 5;
}

export const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
  { href: "/backlog", label: "Backlog", icon: "ListTodo" },
  { href: "/estimate", label: "Estimate", icon: "Calculator" },
  { href: "/sprint", label: "Sprint", icon: "Zap" },
  { href: "/standup", label: "Standup", icon: "Users" },
  { href: "/metrics", label: "Metrics", icon: "BarChart3" },
  { href: "/settings", label: "Settings", icon: "Settings" },
] as const;
