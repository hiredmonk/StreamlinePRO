import { z } from 'zod';

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_DEFAULT_TIMEZONE: z.string().min(1)
});

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_JWT_SECRET: z.string().min(20),
  SUPABASE_AUTH_GOOGLE_CLIENT_ID: z.string().min(1),
  SUPABASE_AUTH_GOOGLE_CLIENT_SECRET: z.string().min(1),
  SUPABASE_STORAGE_BUCKET_ATTACHMENTS: z.string().min(1),
  EMAIL_PROVIDER_API_KEY: z.string().min(1),
  EMAIL_FROM_ADDRESS: z.string().email(),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  SENTRY_DSN: z.string().optional().default('')
});

const shouldSkipValidation =
  process.env.SKIP_ENV_VALIDATION === '1' || process.env.NODE_ENV === 'test';

let cachedClientEnv: z.infer<typeof clientSchema> | null = null;
let cachedServerEnv: z.infer<typeof serverSchema> | null = null;

export function getClientEnv() {
  if (cachedClientEnv) {
    return cachedClientEnv;
  }

  if (shouldSkipValidation) {
    cachedClientEnv = {
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000',
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'anon-key-placeholder',
      NEXT_PUBLIC_DEFAULT_TIMEZONE: process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE ?? 'UTC'
    };

    return cachedClientEnv;
  }

  cachedClientEnv = clientSchema.parse(process.env);
  return cachedClientEnv;
}

export function getServerEnv() {
  if (cachedServerEnv) {
    return cachedServerEnv;
  }

  if (shouldSkipValidation) {
    cachedServerEnv = {
      SUPABASE_SERVICE_ROLE_KEY:
        process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'service-role-key-placeholder',
      SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET ?? 'jwt-secret-placeholder',
      SUPABASE_AUTH_GOOGLE_CLIENT_ID:
        process.env.SUPABASE_AUTH_GOOGLE_CLIENT_ID ?? 'google-client-id-placeholder',
      SUPABASE_AUTH_GOOGLE_CLIENT_SECRET:
        process.env.SUPABASE_AUTH_GOOGLE_CLIENT_SECRET ?? 'google-client-secret-placeholder',
      SUPABASE_STORAGE_BUCKET_ATTACHMENTS:
        process.env.SUPABASE_STORAGE_BUCKET_ATTACHMENTS ?? 'task-attachments',
      EMAIL_PROVIDER_API_KEY: process.env.EMAIL_PROVIDER_API_KEY ?? 'email-api-key-placeholder',
      EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS ?? 'noreply@example.com',
      LOG_LEVEL: 'info',
      SENTRY_DSN: process.env.SENTRY_DSN ?? ''
    };

    return cachedServerEnv;
  }

  cachedServerEnv = serverSchema.parse(process.env);
  return cachedServerEnv;
}
