import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@/lib/supabase/client';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createServerClient, createBrowserClient } from '@supabase/ssr';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getClientEnv, getServerEnv } from '@/lib/env';
import { cookies } from 'next/headers';

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(),
  createBrowserClient: vi.fn()
}));
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn() }));
vi.mock('@/lib/env', () => ({
  getClientEnv: vi.fn(),
  getServerEnv: vi.fn()
}));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));

describe('supabase client factories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClientEnv).mockReturnValue({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-placeholder'
    } as never);
  });

  it('builds browser client with public env vars', () => {
    vi.mocked(createBrowserClient).mockReturnValue({} as never);

    createClient();

    expect(createBrowserClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key-placeholder'
    );
  });

  it('builds admin client with service role key', () => {
    vi.mocked(getServerEnv).mockReturnValue({
      SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-placeholder'
    } as never);
    vi.mocked(createAdminClient).mockReturnValue({} as never);

    createSupabaseAdminClient();

    expect(createAdminClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'service-role-key-placeholder',
      expect.objectContaining({ auth: expect.objectContaining({ persistSession: false }) })
    );
  });

  it('creates server client using Next cookies adapter', async () => {
    const cookieStore = {
      getAll: vi.fn(() => [{ name: 'sb', value: '1' }]),
      set: vi.fn()
    };

    vi.mocked(cookies).mockResolvedValue(cookieStore as never);
    vi.mocked(createServerClient).mockReturnValue({} as never);

    await createServerSupabaseClient();

    expect(createServerClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key-placeholder',
      expect.objectContaining({ cookies: expect.any(Object) })
    );
  });
});
