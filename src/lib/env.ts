import { z } from "zod";

const envSchema = z.object({
  AHA_DOMAIN: z.string().min(1, "AHA_DOMAIN is required"),
  AHA_API_TOKEN: z.string().min(1, "AHA_API_TOKEN is required"),
  AHA_DEFAULT_PRODUCT_ID: z.string().optional(),
  DATABASE_URL: z.string().default("file:./data/aha-smt.db"),
  CACHE_TTL_SECONDS: z.coerce.number().default(60),
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
