import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../schema";

export function createTestDb() {
  const sqlite = new Database(":memory:");
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  // Create all tables
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS standup_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      standup_date TEXT NOT NULL,
      done_since_last_standup TEXT NOT NULL DEFAULT '',
      working_on_now TEXT NOT NULL DEFAULT '',
      blockers TEXT NOT NULL DEFAULT '',
      action_items TEXT NOT NULL DEFAULT '',
      feature_refs TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS blockers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standup_entry_id INTEGER REFERENCES standup_entries(id),
      user_id TEXT NOT NULL,
      description TEXT NOT NULL,
      feature_ref TEXT,
      status TEXT NOT NULL DEFAULT 'open',
      resolved_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS action_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      standup_entry_id INTEGER REFERENCES standup_entries(id),
      user_id TEXT NOT NULL,
      assignee_user_id TEXT,
      description TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sprint_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      release_id TEXT NOT NULL,
      release_ref_num TEXT NOT NULL,
      release_name TEXT NOT NULL,
      start_date TEXT,
      end_date TEXT,
      total_points_planned REAL NOT NULL DEFAULT 0,
      total_points_completed REAL NOT NULL DEFAULT 0,
      total_features_planned INTEGER NOT NULL DEFAULT 0,
      total_features_completed INTEGER NOT NULL DEFAULT 0,
      carryover_points REAL NOT NULL DEFAULT 0,
      member_metrics TEXT NOT NULL DEFAULT '[]',
      feature_snapshot TEXT NOT NULL DEFAULT '[]',
      source_type TEXT NOT NULL DEFAULT 'release',
      point_source TEXT NOT NULL DEFAULT 'score',
      captured_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS estimation_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      feature_id TEXT NOT NULL,
      feature_ref_num TEXT NOT NULL,
      feature_name TEXT NOT NULL,
      scope TEXT NOT NULL,
      complexity TEXT NOT NULL,
      unknowns TEXT NOT NULL,
      suggested_points INTEGER NOT NULL,
      final_points INTEGER NOT NULL,
      estimated_by_user_id TEXT,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS days_off (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_name TEXT,
      date TEXT NOT NULL,
      reason TEXT NOT NULL DEFAULT '',
      is_holiday INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS org_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      type TEXT NOT NULL,
      category TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      default_value TEXT,
      options TEXT,
      updated_at TEXT NOT NULL
    );
  `);

  const db = drizzle(sqlite, { schema });

  // Seed org_config with minimal defaults needed for tests
  // We use raw SQL to avoid circular dependencies with the seed function
  const now = new Date().toISOString();
  sqlite.exec(`
    INSERT INTO org_config (key, value, type, category, label, description, default_value, options, updated_at) VALUES
    ('sprints.mode', '"both"', 'enum', 'sprints', 'Sprint Tracking Mode', 'Which sprint tracking mode to use', '"both"', '["iterations","releases","both"]', '${now}'),
    ('sprints.defaultView', '"iterations"', 'enum', 'sprints', 'Default Sprint View', 'Default tab when mode is both', '"iterations"', '["iterations","releases"]', '${now}'),
    ('points.source', '["original_estimate","score"]', 'array', 'points', 'Point Source Priority', 'Priority order for extracting points', '["original_estimate","score"]', '["score","work_units","original_estimate"]', '${now}'),
    ('points.scale', '[1,2,3,5,8,13,21]', 'array', 'points', 'Point Scale', 'Valid point values shown in estimation UI', '[1,2,3,5,8,13,21]', NULL, '${now}'),
    ('points.defaultPerDay', '1', 'number', 'points', 'Default Points Per Day', 'Starting default for capacity per team member', '1', NULL, '${now}'),
    ('workflow.completeMeanings', '["DONE","SHIPPED"]', 'array', 'workflow', 'Complete Workflow Meanings', 'Status meanings that count as complete', '["DONE","SHIPPED"]', NULL, '${now}'),
    ('backlog.filterType', '"release"', 'enum', 'backlog', 'Backlog Filter Type', 'How to filter features for estimation', '"release"', '["release","team_location","epic","tag","custom_field"]', '${now}'),
    ('estimation.matrix', '{}', 'object', 'estimation', 'Estimation Matrix', 'Scope/Complexity/Unknowns lookup', '{}', NULL, '${now}');
  `);

  return { db, sqlite };
}
