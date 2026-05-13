import { z } from 'zod';

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  APP_ENV: z.enum(['local', 'staging', 'production']).default('local'),
  APP_URL: z.string().url(),
  API_URL: z.string().url(),
  DATABASE_URL: z.string().min(1),
  DIRECT_DATABASE_URL: z.string().min(1).optional(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),
  AUTH_COOKIE_DOMAIN: z.string().optional(),
  AUTH_COOKIE_SECURE: z.coerce.boolean().default(false),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  SUPER_ADMIN_EMAIL: z.string().email().optional(),
  SUPER_ADMIN_PASSWORD: z.string().min(12).optional(),
  SUPER_ADMIN_NAME: z.string().min(1).optional(),
  FIELD_ENCRYPTION_KEY: z.string().min(1),
  FIELD_ENCRYPTION_KEY_VERSION: z.coerce.number().int().positive(),
  REDIS_URL: z.string().min(1),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  CORS_ORIGINS: z.string().min(1),
  RATE_LIMIT_TTL: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  METRICS_ENABLED: z.coerce.boolean().default(true),
  TRUST_PROXY: z.coerce.boolean().default(false),
  CSRF_TRUSTED_ORIGINS: z.string().optional(),
  BACKUP_SCHEDULE_CRON: z.string().default('0 2 * * *'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

export type AppConfig = z.infer<typeof baseSchema>;

export function loadConfig(source: NodeJS.ProcessEnv = process.env): AppConfig {
  return baseSchema.parse(source);
}

export function parseCorsOrigins(value: string): string[] {
  return value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
