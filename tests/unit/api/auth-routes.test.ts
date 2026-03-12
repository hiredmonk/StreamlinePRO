import { beforeEach, describe, expect, it, vi } from 'vitest';
import { GET as getGoogleAuth } from '@/app/auth/google/route';
import { GET as getAuthCallback } from '@/app/auth/callback/route';
import { acceptWorkspaceInvite } from '@/lib/domain/workspaces/invites';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClientEnv } from '@/lib/env';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('@/lib/domain/workspaces/invites', () => ({ acceptWorkspaceInvite: vi.fn() }));
vi.mock('@/lib/env', () => ({ getClientEnv: vi.fn() }));

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getClientEnv).mockReturnValue({
      NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000'
    } as never);
  });

  it('redirects to provider URL on google auth start', async () => {
    const { supabase } = createSupabaseMock([]);
    (supabase.auth as any).signInWithOAuth = vi.fn(async () => ({
      data: { url: 'https://accounts.google.com/o/oauth2/auth?x=1' },
      error: null
    }));

    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    const response = await getGoogleAuth(new Request('http://localhost/auth/google') as never);

    expect(response.headers.get('location')).toContain('accounts.google.com');
  });

  it('passes next path and workspace invite through google auth redirectTo', async () => {
    const { supabase } = createSupabaseMock([]);
    const signInWithOAuth = vi.fn(async () => ({
      data: { url: 'https://accounts.google.com/o/oauth2/auth?x=1' },
      error: null
    }));
    (supabase.auth as any).signInWithOAuth = signInWithOAuth;
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    await getGoogleAuth(
      new Request(
        'http://localhost/auth/google?workspaceInvite=i1&next=%2Fprojects%3Fworkspace%3Dw1'
      ) as never
    );

    expect(signInWithOAuth).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          redirectTo:
            'http://127.0.0.1:3000/auth/callback?next=%2Fprojects%3Fworkspace%3Dw1&workspaceInvite=i1'
        })
      })
    );
  });

  it('falls back to signin with oauth error marker', async () => {
    const { supabase } = createSupabaseMock([]);
    (supabase.auth as any).signInWithOAuth = vi.fn(async () => ({
      data: { url: null },
      error: new Error('oauth failed')
    }));

    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    const response = await getGoogleAuth(new Request('http://localhost/auth/google') as never);

    expect(response.headers.get('location')).toBe('http://localhost/signin?error=oauth_failed');
  });

  it('exchanges callback code and redirects to accepted workspace when invite is present', async () => {
    const { supabase } = createSupabaseMock([]);
    (supabase.auth as any).exchangeCodeForSession = vi.fn(async () => ({ error: null }));
    (supabase.auth as any).getUser = vi.fn(async () => ({
      data: {
        user: {
          id: 'u1',
          email: 'alex@example.com'
        }
      }
    }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);
    vi.mocked(acceptWorkspaceInvite).mockResolvedValue({ workspaceId: 'w1' });

    const response = await getAuthCallback(
      new Request(
        'http://localhost/auth/callback?code=abc&workspaceInvite=i1&next=%2Fprojects%3Fworkspace%3Dw1'
      ) as never
    );

    expect(acceptWorkspaceInvite).toHaveBeenCalledWith({
      inviteId: 'i1',
      userId: 'u1',
      email: 'alex@example.com'
    });
    expect(response.headers.get('location')).toBe('http://127.0.0.1:3000/projects?workspace=w1');
  });

  it('redirects back to signin with invite error when invite acceptance fails', async () => {
    const { supabase } = createSupabaseMock([]);
    (supabase.auth as any).exchangeCodeForSession = vi.fn(async () => ({ error: null }));
    (supabase.auth as any).getUser = vi.fn(async () => ({
      data: {
        user: {
          id: 'u1',
          email: 'alex+other@example.com'
        }
      }
    }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);
    vi.mocked(acceptWorkspaceInvite).mockRejectedValue(
      new Error('Sign in with the invited email address to join this workspace.')
    );

    const response = await getAuthCallback(
      new Request('http://localhost/auth/callback?code=abc&workspaceInvite=i1') as never
    );

    expect(response.headers.get('location')).toBe(
      'http://127.0.0.1:3000/signin?workspaceInvite=i1&error=invite_email_mismatch'
    );
  });

  it('redirects to signin when callback has no valid code', async () => {
    const response = await getAuthCallback(new Request('http://localhost/auth/callback') as never);
    expect(response.headers.get('location')).toBe('http://127.0.0.1:3000/signin');
  });

  it('uses request origin when configured app url is loopback', async () => {
    vi.mocked(getClientEnv).mockReturnValue({
      NEXT_PUBLIC_APP_URL: 'https://0.0.0.0:3001'
    } as never);

    const response = await getAuthCallback(
      new Request('https://streamlinepro.online/auth/callback') as never
    );

    expect(response.headers.get('location')).toBe('https://streamlinepro.online/signin');
  });
});
