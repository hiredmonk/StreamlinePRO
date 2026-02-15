import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCurrentUser, requireUser } from '@/lib/auth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('__redirect__');
  })
}));

describe('auth helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns user and client when session exists', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'u1' } }
        }))
      }
    };

    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    const result = await requireUser();

    expect(result.user.id).toBe('u1');
    expect(result.supabase).toBe(supabase);
  });

  it('redirects to signin when no user exists', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null }
        }))
      }
    };

    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    await expect(requireUser()).rejects.toThrow('__redirect__');
    expect(redirect).toHaveBeenCalledWith('/signin');
  });

  it('returns nullable user from getCurrentUser', async () => {
    const supabase = {
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: null }
        }))
      }
    };

    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    const result = await getCurrentUser();
    expect(result.user).toBeNull();
  });
});
