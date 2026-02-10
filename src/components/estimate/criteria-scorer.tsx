"use client";

import type { EstimationCriteria, CriteriaLevel } from "@/lib/constants";
import { cn } from "@/lib/utils";

interface CriteriaScorerProps {
  criteria: EstimationCriteria;
  onChange: (criteria: EstimationCriteria) => void;
}

const CRITERIA_ROWS: {
  key: keyof EstimationCriteria;
  label: string;
  description: string;
}[] = [
  {
    key: "scope",
    label: "Scope",
    description: "How much work is involved?",
  },
  {
    key: "complexity",
    label: "Complexity",
    description: "How hard is the work?",
  },
  {
    key: "unknowns",
    label: "Unknowns",
    description: "How much uncertainty exists?",
  },
];

const LEVELS: { value: CriteriaLevel; label: string }[] = [
  { value: "L", label: "L" },
  { value: "M", label: "M" },
  { value: "H", label: "H" },
];

export function CriteriaScorer({ criteria, onChange }: CriteriaScorerProps) {
  function handleChange(key: keyof EstimationCriteria, level: CriteriaLevel) {
    onChange({ ...criteria, [key]: level });
  }

  return (
    <div className="space-y-4">
      {CRITERIA_ROWS.map((row) => (
        <div key={row.key} className="flex items-center gap-4">
          <div className="w-32 shrink-0">
            <p className="text-sm font-medium text-text-primary">
              {row.label}
            </p>
            <p className="text-xs text-text-muted">{row.description}</p>
          </div>
          <div className="flex gap-2">
            {LEVELS.map((level) => (
              <button
                key={level.value}
                type="button"
                onClick={() => handleChange(row.key, level.value)}
                className={cn(
                  "flex h-9 w-12 items-center justify-center rounded-md text-sm font-medium transition-colors",
                  criteria[row.key] === level.value
                    ? "bg-primary text-white"
                    : "bg-surface text-text-secondary hover:text-text-primary border border-border"
                )}
              >
                {level.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
