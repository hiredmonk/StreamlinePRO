import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  cancelWorkspaceInviteAction,
  createWorkspaceInviteAction,
  removeWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction
} from '@/lib/actions/workspace-actions';
import { requireUser } from '@/lib/auth';
import { normalizeEmail, sendWorkspaceInviteEmail } from '@/lib/domain/workspaces/invites';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/lib/domain/workspaces/invites', () => ({
  normalizeEmail: (email: string) => email.trim().toLowerCase(),
  sendWorkspaceInviteEmail: vi.fn()
}));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const ids = {
  userA: '11111111-1111-4111-8111-111111111111',
  userB: '22222222-2222-4222-8222-222222222222',
  workspace: '33333333-3333-4333-8333-333333333333',
  invite: '44444444-4444-4444-8444-444444444444',
  project: '55555555-5555-4555-8555-555555555555'
};

describe('workspace actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendWorkspaceInviteEmail).mockResolvedValue(undefined);
  });

  it('creates an invite, normalizes email, and sends the invite email', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'workspaces',
        response: { data: { id: ids.workspace, name: 'Ops' }, error: null }
      },
      {
        table: 'workspace_invites',
        response: { data: [], error: null }
      },
      {
        table: 'workspace_invites',
        response: { data: { id: ids.invite }, error: null }
      }
    ]);
    const { supabase: adminSupabase } = createSupabaseMock([]);
    (adminSupabase as any).auth = {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: { users: [] },
          error: null
        })
      }
    };
    vi.mocked(createSupabaseAdminClient).mockReturnValue(adminSupabase as never);

    vi.mocked(requireUser).mockResolvedValue({
      user: {
        id: ids.userA,
        email: 'owner@example.com',
        user_metadata: { full_name: 'Owner' }
      } as never,
      supabase: supabase as never
    });

    const result = await createWorkspaceInviteAction({
      workspaceId: ids.workspace,
      email: 'Alex@Example.com',
      role: 'admin'
    });

    expect(result).toEqual({ ok: true, data: { inviteId: ids.invite } });
    expect(history[2]?.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: ids.workspace,
        email: normalizeEmail('Alex@Example.com'),
        role: 'admin'
      })
    );
    expect(sendWorkspaceInviteEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        inviteId: ids.invite,
        workspaceName: 'Ops',
        inviteEmail: 'alex@example.com',
        inviterLabel: 'Owner'
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/projects');
  });

  it('rejects invite when email belongs to an existing workspace member', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'workspaces',
        response: { data: { id: ids.workspace, name: 'Ops' }, error: null }
      },
      // existing member check
      {
        table: 'workspace_members',
        response: { data: { user_id: ids.userB }, error: null }
      }
    ]);
    const { supabase: adminSupabase } = createSupabaseMock([]);
    // Mock admin auth to return a user matching the invited email
    (adminSupabase as any).auth = {
      admin: {
        listUsers: vi.fn().mockResolvedValue({
          data: {
            users: [{ id: ids.userB, email: 'existing@example.com' }]
          },
          error: null
        })
      }
    };

    vi.mocked(requireUser).mockResolvedValue({
      user: {
        id: ids.userA,
        email: 'owner@example.com',
        user_metadata: { full_name: 'Owner' }
      } as never,
      supabase: supabase as never
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(adminSupabase as never);

    const result = await createWorkspaceInviteAction({
      workspaceId: ids.workspace,
      email: 'Existing@Example.com',
      role: 'member'
    });

    expect(result).toEqual({ ok: false, error: 'User is already a workspace member.' });
    expect(sendWorkspaceInviteEmail).not.toHaveBeenCalled();
  });

  it('cancels pending invites', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'workspace_invites',
        response: {
          data: {
            id: ids.invite,
            workspace_id: ids.workspace,
            accepted_at: null,
            revoked_at: null
          },
          error: null
        }
      },
      {
        table: 'workspace_invites',
        response: { data: null, error: null }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });

    const result = await cancelWorkspaceInviteAction({ inviteId: ids.invite });

    expect(result).toEqual({
      ok: true,
      data: { inviteId: ids.invite, workspaceId: ids.workspace }
    });
    expect(history[1]?.chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked_at: expect.any(String) })
    );
  });

  it('prevents demoting the last admin', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: [{ user_id: ids.userA, role: 'admin' }],
          error: null
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });

    const result = await updateWorkspaceMemberRoleAction({
      workspaceId: ids.workspace,
      userId: ids.userA,
      role: 'member'
    });

    expect(result).toEqual({ ok: false, error: 'Workspace must keep at least one admin.' });
  });

  it('removes member access, unassigns open tasks, and deletes project memberships', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: [
            { user_id: ids.userA, role: 'admin' },
            { user_id: ids.userB, role: 'member' }
          ],
          error: null
        }
      },
      {
        table: 'workspace_members',
        response: { data: null, error: null }
      }
    ]);
    const { supabase: adminSupabase, history: adminHistory } = createSupabaseMock([
      {
        table: 'projects',
        response: {
          data: [{ id: ids.project }],
          error: null
        }
      },
      {
        table: 'tasks',
        response: { data: null, error: null }
      },
      {
        table: 'project_members',
        response: { data: null, error: null }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(adminSupabase as never);

    const result = await removeWorkspaceMemberAction({
      workspaceId: ids.workspace,
      userId: ids.userB
    });

    expect(result).toEqual({
      ok: true,
      data: { workspaceId: ids.workspace, userId: ids.userB }
    });
    expect(adminHistory[1]?.chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ assignee_id: null, updated_at: expect.any(String) })
    );
    expect(adminHistory[2]?.chain.delete).toHaveBeenCalled();
    expect(history[1]?.chain.delete).toHaveBeenCalled();
  });
});
