import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/inbox/route';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

describe('GET /api/inbox', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 for anonymous users', async () => {
    const { supabase } = createSupabaseMock([]);
    (supabase.auth as any).getUser = vi.fn(async () => ({ data: { user: null } }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    const response = await GET({ nextUrl: new URL('http://localhost/api/inbox') } as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns unread-only items when unread=1', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'notifications',
        response: {
          data: [{ id: 'n1', read_at: null }],
          error: null
        }
      }
    ]);

    (supabase.auth as any).getUser = vi.fn(async () => ({ data: { user: { id: 'u1' } } }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    const response = await GET({ nextUrl: new URL('http://localhost/api/inbox?unread=1') } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ items: [{ id: 'n1', read_at: null }] });
    expect(history[0]?.chain.is).toHaveBeenCalledWith('read_at', null);
  });
});
