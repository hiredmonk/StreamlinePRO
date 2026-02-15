import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signOutAction } from '@/lib/actions/auth-actions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

describe('auth actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('signs out and redirects to signin page', async () => {
    const signOut = vi.fn(async () => ({ error: null }));

    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { signOut }
    } as never);

    await signOutAction();

    expect(signOut).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith('/signin');
  });
});
