import { beforeEach, describe, expect, it, vi } from 'vitest';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import { getClientEnv } from '@/lib/env';
import { NextResponse } from 'next/server';

vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn() }));
vi.mock('@/lib/env', () => ({ getClientEnv: vi.fn() }));
vi.mock('next/server', () => ({
  NextResponse: {
    next: vi.fn(() => ({
      cookies: {
        set: vi.fn()
      }
    }))
  }
}));

describe('supabase session middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClientEnv).mockReturnValue({
      NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key-placeholder'
    } as never);
  });

  it('refreshes user session via server client', async () => {
    const getUser = vi.fn(async () => ({ data: { user: null } }));

    vi.mocked(createServerClient).mockReturnValue({
      auth: { getUser }
    } as never);

    const request = {
      cookies: {
        getAll: vi.fn(() => []),
        set: vi.fn()
      }
    };

    const response = await updateSession(request as never);

    expect(NextResponse.next).toHaveBeenCalled();
    expect(createServerClient).toHaveBeenCalledWith(
      'https://example.supabase.co',
      'anon-key-placeholder',
      expect.objectContaining({ cookies: expect.any(Object) })
    );
    expect(getUser).toHaveBeenCalled();
    expect(response).toBeTruthy();
  });
});
