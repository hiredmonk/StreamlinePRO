import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  inviteWorkspaceMemberAction,
  listWorkspaceMembersQuery,
  removeWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction
} from '@/lib/actions/member-actions';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';
import { requireUser } from '@/lib/auth';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const TARGET_ID = '22222222-2222-4222-8222-222222222222';
const WORKSPACE_ID = '33333333-3333-4333-8333-333333333333';

type AuthUserLike = { id: string; email: string | null };

describe('member actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invites an existing auth user into workspace', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: ACTOR_ID,
            role: 'admin',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      { table: 'workspace_members', response: { data: null } },
      { table: 'workspace_members', response: { data: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ACTOR_ID } as never,
      supabase: supabase as never
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      createAdminClientMock([{ id: TARGET_ID, email: 'newmember@example.com' }]) as never
    );

    const result = await inviteWorkspaceMemberAction({
      workspaceId: WORKSPACE_ID,
      email: 'newmember@example.com',
      role: 'member',
      invitedByUserId: ACTOR_ID
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected invite to succeed.');
    }

    expect(history[2]?.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        workspace_id: WORKSPACE_ID,
        user_id: TARGET_ID,
        role: 'member'
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/projects');
    expect(revalidatePath).toHaveBeenCalledWith('/my-tasks');
    expect(revalidatePath).toHaveBeenCalledWith('/inbox');
  });

  it('fails invite when email has no auth account', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: ACTOR_ID,
            role: 'admin',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ACTOR_ID } as never,
      supabase: supabase as never
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(createAdminClientMock([]) as never);

    const result = await inviteWorkspaceMemberAction({
      workspaceId: WORKSPACE_ID,
      email: 'missing@example.com',
      role: 'member',
      invitedByUserId: ACTOR_ID
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('No account exists for this email address.');
    }
  });

  it('fails invite when user is already a member', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: ACTOR_ID,
            role: 'admin',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: TARGET_ID,
            role: 'member',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ACTOR_ID } as never,
      supabase: supabase as never
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      createAdminClientMock([{ id: TARGET_ID, email: 'existing@example.com' }]) as never
    );

    const result = await inviteWorkspaceMemberAction({
      workspaceId: WORKSPACE_ID,
      email: 'existing@example.com',
      role: 'member',
      invitedByUserId: ACTOR_ID
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('User is already a workspace member.');
    }
  });

  it('updates workspace member role', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: ACTOR_ID,
            role: 'admin',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: TARGET_ID,
            role: 'member',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID
          }
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ACTOR_ID } as never,
      supabase: supabase as never
    });

    const result = await updateWorkspaceMemberRoleAction({
      workspaceId: WORKSPACE_ID,
      memberUserId: TARGET_ID,
      nextRole: 'admin',
      actorUserId: ACTOR_ID
    });

    expect(result.ok).toBe(true);
    expect(history[2]?.chain.update).toHaveBeenCalledWith({ role: 'admin' });
  });

  it('blocks demoting the last admin', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: ACTOR_ID,
            role: 'admin',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: ACTOR_ID,
            role: 'admin',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      {
        table: 'workspace_members',
        response: {
          data: [{ user_id: ACTOR_ID }]
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ACTOR_ID } as never,
      supabase: supabase as never
    });

    const result = await updateWorkspaceMemberRoleAction({
      workspaceId: WORKSPACE_ID,
      memberUserId: ACTOR_ID,
      nextRole: 'member',
      actorUserId: ACTOR_ID
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Cannot remove or demote the last workspace admin.');
    }
  });

  it('returns concurrency error when role update compare-and-swap misses', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: ACTOR_ID,
            role: 'admin',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: TARGET_ID,
            role: 'member',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      { table: 'workspace_members', response: { data: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ACTOR_ID } as never,
      supabase: supabase as never
    });

    const result = await updateWorkspaceMemberRoleAction({
      workspaceId: WORKSPACE_ID,
      memberUserId: TARGET_ID,
      nextRole: 'admin',
      actorUserId: ACTOR_ID
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Member role changed concurrently. Please refresh and retry.');
    }
  });

  it('removes member and clears project memberships in workspace', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: ACTOR_ID,
            role: 'admin',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: TARGET_ID,
            role: 'member',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      {
        table: 'projects',
        response: {
          data: [{ id: 'p1' }, { id: 'p2' }]
        }
      },
      { table: 'project_members', response: { data: null } },
      { table: 'workspace_members', response: { data: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ACTOR_ID } as never,
      supabase: supabase as never
    });

    const result = await removeWorkspaceMemberAction({
      workspaceId: WORKSPACE_ID,
      memberUserId: TARGET_ID,
      actorUserId: ACTOR_ID
    });

    expect(result.ok).toBe(true);
    expect(history[3]?.chain.delete).toHaveBeenCalled();
    expect(history[4]?.chain.delete).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/projects/p1');
    expect(revalidatePath).toHaveBeenCalledWith('/projects/p2');
  });

  it('blocks removing the last workspace admin', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: ACTOR_ID,
            role: 'admin',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: ACTOR_ID,
            role: 'admin',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      {
        table: 'workspace_members',
        response: {
          data: [{ user_id: ACTOR_ID }]
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ACTOR_ID } as never,
      supabase: supabase as never
    });

    const result = await removeWorkspaceMemberAction({
      workspaceId: WORKSPACE_ID,
      memberUserId: ACTOR_ID,
      actorUserId: ACTOR_ID
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Cannot remove or demote the last workspace admin.');
    }
  });

  it('lists workspace members for regular members', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: {
            workspace_id: WORKSPACE_ID,
            user_id: ACTOR_ID,
            role: 'member',
            created_at: '2026-02-15T00:00:00.000Z'
          }
        }
      },
      {
        table: 'workspace_members',
        response: {
          data: [
            {
              workspace_id: WORKSPACE_ID,
              user_id: ACTOR_ID,
              role: 'member',
              created_at: '2026-02-15T00:00:00.000Z'
            },
            {
              workspace_id: WORKSPACE_ID,
              user_id: TARGET_ID,
              role: 'admin',
              created_at: '2026-02-16T00:00:00.000Z'
            }
          ]
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ACTOR_ID } as never,
      supabase: supabase as never
    });
    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      createAdminClientMock([
        { id: ACTOR_ID, email: 'member@example.com' },
        { id: TARGET_ID, email: 'admin@example.com' }
      ]) as never
    );

    const result = await listWorkspaceMembersQuery({
      workspaceId: WORKSPACE_ID,
      actorUserId: ACTOR_ID
    });

    expect(result.members).toEqual([
      expect.objectContaining({
        userId: ACTOR_ID,
        email: 'member@example.com',
        role: 'member'
      }),
      expect.objectContaining({
        userId: TARGET_ID,
        email: 'admin@example.com',
        role: 'admin'
      })
    ]);
  });

  it('rejects list query for non-members', async () => {
    const { supabase } = createSupabaseMock([
      { table: 'workspace_members', response: { data: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ACTOR_ID } as never,
      supabase: supabase as never
    });

    await expect(
      listWorkspaceMembersQuery({
        workspaceId: WORKSPACE_ID,
        actorUserId: ACTOR_ID
      })
    ).rejects.toThrow('Only workspace members can view workspace members.');
  });
});

function createAdminClientMock(users: AuthUserLike[]) {
  const listUsers = vi
    .fn()
    .mockResolvedValueOnce({
      data: { users },
      error: null
    })
    .mockResolvedValue({
      data: { users: [] },
      error: null
    });

  return {
    auth: {
      admin: {
        listUsers
      }
    }
  };
}
