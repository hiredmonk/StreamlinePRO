import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from '@/app/api/search/route';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));

describe('GET /api/search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns empty results for blank query', async () => {
    const response = await GET({ nextUrl: new URL('http://localhost/api/search') } as never);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ results: [] });
  });

  it('returns 401 when user is not authenticated', async () => {
    const { supabase } = createSupabaseMock([]);
    (supabase.auth as any).getUser = vi.fn(async () => ({ data: { user: null } }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    const response = await GET({ nextUrl: new URL('http://localhost/api/search?q=ship') } as never);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('returns search results for authenticated users', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: [{ id: 't1', title: 'Ship release', project_id: 'p1', projects: { name: 'Core' } }],
          error: null
        }
      }
    ]);

    (supabase.auth as any).getUser = vi.fn(async () => ({ data: { user: { id: 'u1' } } }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    const response = await GET({ nextUrl: new URL('http://localhost/api/search?q=ship') } as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      results: [{ id: 't1', title: 'Ship release', project_id: 'p1', projects: { name: 'Core' } }]
    });
  });
});
