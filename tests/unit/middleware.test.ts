import { describe, expect, it, vi } from 'vitest';
import { middleware } from '@/middleware';
import { updateSession } from '@/lib/supabase/middleware';

vi.mock('@/lib/supabase/middleware', () => ({ updateSession: vi.fn() }));

describe('root middleware', () => {
  it('delegates request handling to updateSession', async () => {
    const response = new Response('ok');
    vi.mocked(updateSession).mockResolvedValue(response as never);

    const request = { url: 'http://localhost/my-tasks' } as never;
    const result = await middleware(request);

    expect(updateSession).toHaveBeenCalledWith(request);
    expect(result).toBe(response);
  });
});
