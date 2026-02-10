import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const standupEntries = sqliteTable("standup_entries", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  standupDate: text("standup_date").notNull(), // YYYY-MM-DD
  doneSinceLastStandup: text("done_since_last_standup").notNull().default(""),
  workingOnNow: text("working_on_now").notNull().default(""),
  blockers: text("blockers").notNull().default(""),
  actionItems: text("action_items").notNull().default(""),
  featureRefs: text("feature_refs").notNull().default("[]"), // JSON array
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const blockersTable = sqliteTable("blockers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  standupEntryId: integer("standup_entry_id").references(() => standupEntries.id),
  userId: text("user_id").notNull(),
  description: text("description").notNull(),
  featureRef: text("feature_ref"),
  status: text("status").notNull().default("open"), // open | resolved
  resolvedAt: text("resolved_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const actionItemsTable = sqliteTable("action_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  standupEntryId: integer("standup_entry_id").references(() => standupEntries.id),
  userId: text("user_id").notNull(),
  assigneeUserId: text("assignee_user_id"),
  description: text("description").notNull(),
  completed: integer("completed", { mode: "boolean" }).notNull().default(false),
  completedAt: text("completed_at"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const sprintSnapshots = sqliteTable("sprint_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  releaseId: text("release_id").notNull(),
  releaseRefNum: text("release_ref_num").notNull(),
  releaseName: text("release_name").notNull(),
  startDate: text("start_date"),
  endDate: text("end_date"),
  totalPointsPlanned: real("total_points_planned").notNull().default(0),
  totalPointsCompleted: real("total_points_completed").notNull().default(0),
  totalFeaturesPlanned: integer("total_features_planned").notNull().default(0),
  totalFeaturesCompleted: integer("total_features_completed").notNull().default(0),
  carryoverPoints: real("carryover_points").notNull().default(0),
  memberMetrics: text("member_metrics").notNull().default("[]"), // JSON
  featureSnapshot: text("feature_snapshot").notNull().default("[]"), // JSON
  capturedAt: text("captured_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const estimationHistory = sqliteTable("estimation_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  featureId: text("feature_id").notNull(),
  featureRefNum: text("feature_ref_num").notNull(),
  featureName: text("feature_name").notNull(),
  scope: text("scope").notNull(), // L | M | H
  complexity: text("complexity").notNull(), // L | M | H
  unknowns: text("unknowns").notNull(), // L | M | H
  suggestedPoints: integer("suggested_points").notNull(),
  finalPoints: integer("final_points").notNull(),
  estimatedByUserId: text("estimated_by_user_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

export const daysOff = sqliteTable("days_off", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: text("user_id"), // null = company-wide holiday
  userName: text("user_name"),
  date: text("date").notNull(), // YYYY-MM-DD
  reason: text("reason").notNull().default(""),
  isHoliday: integer("is_holiday", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
