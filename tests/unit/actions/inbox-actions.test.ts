import { beforeEach, describe, expect, it, vi } from 'vitest';
import { markNotificationReadAction } from '@/lib/actions/inbox-actions';
import { requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('inbox actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('marks notification as read and revalidates inbox', async () => {
    const { supabase, history } = createSupabaseMock([
      { table: 'notifications', response: { data: null, error: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: supabase as never
    });

    const id = '11111111-1111-4111-8111-111111111111';
    const result = await markNotificationReadAction({ id });

    expect(result).toEqual({ ok: true, data: { id } });
    expect(history[0]?.chain.update).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/inbox');
  });

  it('returns error for invalid payload', async () => {
    const result = await markNotificationReadAction({ id: 'bad' });
    expect(result.ok).toBe(false);
  });
});
