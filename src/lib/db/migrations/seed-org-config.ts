import type { Database } from "better-sqlite3";
import { DEFAULT_CONFIG, type AhaSMTConfig } from "../../config";

interface ConfigSeedRow {
  key: string;
  value: string;
  type: "string" | "number" | "array" | "object" | "enum";
  category: "backlog" | "points" | "estimation" | "sprints" | "workflow";
  label: string;
  description?: string;
  defaultValue: string;
  options?: string;
  updatedAt: string;
}

/**
 * Seeds org_config table with defaults from DEFAULT_CONFIG.
 * Can optionally merge in custom values from file-based config.
 */
export function seedOrgConfig(
  sqlite: Database,
  customConfig: Partial<AhaSMTConfig> = {}
): void {
  const config: AhaSMTConfig = {
    ...DEFAULT_CONFIG,
    points: { ...DEFAULT_CONFIG.points, ...customConfig.points },
    sprints: { ...DEFAULT_CONFIG.sprints, ...customConfig.sprints },
    workflow: { ...DEFAULT_CONFIG.workflow, ...customConfig.workflow },
    estimation: { ...DEFAULT_CONFIG.estimation, ...customConfig.estimation },
    backlog: { ...DEFAULT_CONFIG.backlog, ...customConfig.backlog },
  };

  const now = new Date().toISOString();

  const seeds: ConfigSeedRow[] = [
    // Backlog configuration
    {
      key: "backlog.filterType",
      value: JSON.stringify(config.backlog.filterType),
      type: "enum",
      category: "backlog",
      label: "Backlog Filter Type",
      description: "How to filter features for estimation/backlog views",
      defaultValue: JSON.stringify(DEFAULT_CONFIG.backlog.filterType),
      options: JSON.stringify(["release", "team_location", "epic", "tag", "custom_field"]),
      updatedAt: now,
    },
    {
      key: "backlog.customFieldKey",
      value: JSON.stringify(config.backlog.customFieldKey ?? null),
      type: "string",
      category: "backlog",
      label: "Custom Field Key",
      description: "Field name when using custom_field filter type",
      defaultValue: JSON.stringify(null),
      updatedAt: now,
    },
    {
      key: "backlog.teamProductId",
      value: JSON.stringify(config.backlog.teamProductId ?? null),
      type: "string",
      category: "backlog",
      label: "Develop Product ID",
      description: "Product ID to use when filterType is team_location (find in your Aha URL)",
      defaultValue: JSON.stringify(null),
      updatedAt: now,
    },
    {
      key: "backlog.excludeWorkflowKinds",
      value: JSON.stringify(config.backlog.excludeWorkflowKinds ?? []),
      type: "array",
      category: "backlog",
      label: "Exclude Workflow Kinds",
      description: "These won't appear in estimation queue (e.g., Bug, Test, Spike)",
      defaultValue: JSON.stringify([]),
      updatedAt: now,
    },

    // Points configuration
    {
      key: "points.source",
      value: JSON.stringify(config.points.source),
      type: "array",
      category: "points",
      label: "Point Source Priority",
      description: "Priority order for extracting points. First non-null value wins.",
      defaultValue: JSON.stringify(DEFAULT_CONFIG.points.source),
      options: JSON.stringify(["score", "work_units", "original_estimate"]),
      updatedAt: now,
    },
    {
      key: "points.scale",
      value: JSON.stringify(config.points.scale),
      type: "array",
      category: "points",
      label: "Point Scale",
      description: "Valid point values shown in the estimation UI",
      defaultValue: JSON.stringify(DEFAULT_CONFIG.points.scale),
      updatedAt: now,
    },
    {
      key: "points.defaultPerDay",
      value: JSON.stringify(config.points.defaultPerDay),
      type: "number",
      category: "points",
      label: "Default Points Per Day",
      description: "Starting default for capacity per team member per day",
      defaultValue: JSON.stringify(DEFAULT_CONFIG.points.defaultPerDay),
      updatedAt: now,
    },

    // Sprints configuration
    {
      key: "sprints.mode",
      value: JSON.stringify(config.sprints.mode),
      type: "enum",
      category: "sprints",
      label: "Sprint Tracking Mode",
      description: "Which sprint tracking mode to use",
      defaultValue: JSON.stringify(DEFAULT_CONFIG.sprints.mode),
      options: JSON.stringify(["iterations", "releases", "both"]),
      updatedAt: now,
    },
    {
      key: "sprints.defaultView",
      value: JSON.stringify(config.sprints.defaultView),
      type: "enum",
      category: "sprints",
      label: "Default Sprint View",
      description: "Default tab when mode is 'both'",
      defaultValue: JSON.stringify(DEFAULT_CONFIG.sprints.defaultView),
      options: JSON.stringify(["iterations", "releases"]),
      updatedAt: now,
    },

    // Workflow configuration
    {
      key: "workflow.completeMeanings",
      value: JSON.stringify(config.workflow.completeMeanings),
      type: "array",
      category: "workflow",
      label: "Complete Workflow Meanings",
      description: "Aha internalMeaning values that count as complete",
      defaultValue: JSON.stringify(DEFAULT_CONFIG.workflow.completeMeanings),
      updatedAt: now,
    },

    // Estimation matrix
    {
      key: "estimation.matrix",
      value: JSON.stringify(config.estimation.matrix),
      type: "object",
      category: "estimation",
      label: "Estimation Matrix",
      description: "Scope/Complexity/Unknowns → Points lookup (keys like 'L-M-H')",
      defaultValue: JSON.stringify(DEFAULT_CONFIG.estimation.matrix),
      updatedAt: now,
    },
  ];

  // Insert or replace config values
  const stmt = sqlite.prepare(`
    INSERT OR REPLACE INTO org_config (key, value, type, category, label, description, default_value, options, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const seed of seeds) {
    stmt.run(
      seed.key,
      seed.value,
      seed.type,
      seed.category,
      seed.label,
      seed.description ?? null,
      seed.defaultValue,
      seed.options ?? null,
      seed.updatedAt
    );
  }
}
