import { describe, expect, it, vi } from 'vitest';
import { loadProjectsPageData } from '@/lib/page-loaders/projects-page';
import { requireUser } from '@/lib/auth';
import { getProjectsForWorkspace, getWorkspacesForUser } from '@/lib/domain/projects/queries';
import { loadWorkspaceTeamAccessData } from '@/lib/page-loaders/workspace-team-access';

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn()
}));
vi.mock('@/lib/domain/projects/queries', () => ({
  getWorkspacesForUser: vi.fn(),
  getProjectsForWorkspace: vi.fn()
}));
vi.mock('@/lib/page-loaders/workspace-team-access', () => ({
  loadWorkspaceTeamAccessData: vi.fn()
}));

describe('loadProjectsPageData', () => {
  it('returns no-workspaces when the user has none', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: {} as never
    });
    vi.mocked(getWorkspacesForUser).mockResolvedValue([]);

    await expect(loadProjectsPageData({})).resolves.toEqual({ mode: 'no-workspaces' });
  });

  it('returns workspace detail plus team access for a valid admin workspace query', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: {} as never
    });
    vi.mocked(getWorkspacesForUser).mockResolvedValue([
      { id: 'w1', name: 'Ops', icon: null, role: 'admin' }
    ]);
    vi.mocked(getProjectsForWorkspace).mockResolvedValue([
      {
        id: 'p1',
        workspaceId: 'w1',
        name: 'Core',
        description: null,
        privacy: 'workspace_visible',
        taskCount: 0,
        overdueCount: 0
      }
    ]);
    vi.mocked(loadWorkspaceTeamAccessData).mockResolvedValue({
      members: [],
      pendingInvites: []
    });

    await expect(loadProjectsPageData({ workspace: 'w1' })).resolves.toEqual({
      mode: 'workspace-detail',
      workspaces: [{ id: 'w1', name: 'Ops', icon: null, role: 'admin' }],
      activeWorkspace: { id: 'w1', name: 'Ops', icon: null, role: 'admin' },
      projects: [
        {
          id: 'p1',
          workspaceId: 'w1',
          name: 'Core',
          description: null,
          privacy: 'workspace_visible',
          taskCount: 0,
          overdueCount: 0
        }
      ],
      teamAccess: {
        members: [],
        pendingInvites: []
      }
    });
  });

  it('falls back to null team access when the admin panel data fails to load', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: {} as never
    });
    vi.mocked(getWorkspacesForUser).mockResolvedValue([
      { id: 'w1', name: 'Ops', icon: null, role: 'admin' }
    ]);
    vi.mocked(getProjectsForWorkspace).mockResolvedValue([]);
    vi.mocked(loadWorkspaceTeamAccessData).mockRejectedValue(new Error('boom'));

    await expect(loadProjectsPageData({ workspace: 'w1' })).resolves.toEqual({
      mode: 'workspace-detail',
      workspaces: [{ id: 'w1', name: 'Ops', icon: null, role: 'admin' }],
      activeWorkspace: { id: 'w1', name: 'Ops', icon: null, role: 'admin' },
      projects: [],
      teamAccess: null
    });
  });
});
