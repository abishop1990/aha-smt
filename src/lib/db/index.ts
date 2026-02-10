import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./schema";
import { existsSync, mkdirSync } from "fs";
import { dirname } from "path";

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (_db) return _db;

  const dbUrl = process.env.DATABASE_URL || "file:./data/aha-smt.db";
  const dbPath = dbUrl.replace("file:", "");

  // Ensure directory exists
  const dir = dirname(dbPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  _db = drizzle(sqlite, { schema });

  // Auto-create tables
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
  `);

  // Migration: add new columns to sprint_snapshots for existing databases
  try {
    sqlite.exec(`ALTER TABLE sprint_snapshots ADD COLUMN source_type TEXT NOT NULL DEFAULT 'release'`);
  } catch { /* column already exists */ }
  try {
    sqlite.exec(`ALTER TABLE sprint_snapshots ADD COLUMN point_source TEXT NOT NULL DEFAULT 'score'`);
  } catch { /* column already exists */ }

  return _db;
}
