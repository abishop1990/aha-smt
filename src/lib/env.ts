import { z } from "zod";

const envSchema = z.object({
  AHA_DOMAIN: z.string().min(1, "AHA_DOMAIN is required"),
  AHA_API_TOKEN: z.string().min(1, "AHA_API_TOKEN is required"),
  AHA_DEFAULT_PRODUCT_ID: z.string().optional(),
  AHA_TEAM_PRODUCT_ID: z.string().optional(),
  DATABASE_URL: z.string().default("file:./data/aha-smt.db"),
  CACHE_TTL_SECONDS: z.coerce.number().default(60),

  // === Organization Configuration (optional — also editable in Settings UI) ===
  BACKLOG_FILTER_TYPE: z
    .enum(["release", "team_location", "epic", "tag", "custom_field"])
    .optional(),
  BACKLOG_TEAM_PRODUCT_ID: z.string().optional(),
  BACKLOG_EXCLUDE_WORKFLOW_KINDS: z.string().optional(), // comma-separated
  BACKLOG_CUSTOM_FIELD_KEY: z.string().optional(),

  POINTS_SOURCE: z.string().optional(), // comma-separated: original_estimate,score,work_units
  POINTS_SCALE: z.string().optional(), // comma-separated numbers: 1,2,3,5,8,13,21
  POINTS_DEFAULT_PER_DAY: z.coerce.number().optional(),

  SPRINTS_MODE: z.enum(["iterations", "releases", "both"]).optional(),
  SPRINTS_DEFAULT_VIEW: z.enum(["iterations", "releases"]).optional(),

  WORKFLOW_COMPLETE_MEANINGS: z.string().optional(), // comma-separated

  ESTIMATION_MATRIX: z.string().optional(), // JSON string
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (_env) return _env;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. Check .env.local against .env.example");
  }
  _env = parsed.data;
  return _env;
}

/** @internal Reset cached env for testing */
export function __resetEnv(): void {
  _env = null;
}
