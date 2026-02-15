import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('env helpers', () => {
  beforeEach(() => {
    vi.resetModules();

    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE;
    delete process.env.SUPABASE_STORAGE_BUCKET_ATTACHMENTS;
    delete process.env.EMAIL_FROM_ADDRESS;
    delete process.env.SENTRY_DSN;
  });

  it('returns client fallback values in test environment', async () => {
    const { getClientEnv } = await import('@/lib/env');
    const env = getClientEnv();

    expect(env.NEXT_PUBLIC_APP_URL).toBe('http://127.0.0.1:3000');
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBe('https://example.supabase.co');
    expect(env.NEXT_PUBLIC_DEFAULT_TIMEZONE).toBe('UTC');
  });

  it('returns server fallback values in test environment', async () => {
    const { getServerEnv } = await import('@/lib/env');
    const env = getServerEnv();

    expect(env.SUPABASE_STORAGE_BUCKET_ATTACHMENTS).toBe('task-attachments');
    expect(env.EMAIL_FROM_ADDRESS).toBe('noreply@example.com');
    expect(env.LOG_LEVEL).toBe('info');
  });

  it('caches client env after first read', async () => {
    process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE = 'America/New_York';
    const { getClientEnv } = await import('@/lib/env');

    const first = getClientEnv();
    process.env.NEXT_PUBLIC_DEFAULT_TIMEZONE = 'Asia/Kolkata';
    const second = getClientEnv();

    expect(first.NEXT_PUBLIC_DEFAULT_TIMEZONE).toBe('America/New_York');
    expect(second.NEXT_PUBLIC_DEFAULT_TIMEZONE).toBe('America/New_York');
  });
});
