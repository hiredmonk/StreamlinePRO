import { describe, expect, it, vi } from 'vitest';
import { loadProjectsPageData } from '@/lib/page-loaders/projects-page';
import { requireUser } from '@/lib/auth';
import { getProjectsForWorkspace, getWorkspacesForUser } from '@/lib/domain/projects/queries';
import { getProjectTemplateSummaries } from '@/lib/domain/projects/template-queries';
import { loadWorkspaceTeamAccessData } from '@/lib/page-loaders/workspace-team-access';

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn()
}));
vi.mock('@/lib/domain/projects/queries', () => ({
  getWorkspacesForUser: vi.fn(),
  getProjectsForWorkspace: vi.fn()
}));
vi.mock('@/lib/domain/projects/template-queries', () => ({
  getProjectTemplateSummaries: vi.fn()
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

  it('returns onboarding for an admin workspace with no projects yet', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: {} as never
    });
    vi.mocked(getWorkspacesForUser).mockResolvedValue([
      { id: 'w1', name: 'Ops', icon: null, role: 'admin' }
    ]);
    vi.mocked(getProjectsForWorkspace).mockResolvedValue([]);
    vi.mocked(getProjectTemplateSummaries).mockResolvedValue([]);
    vi.mocked(loadWorkspaceTeamAccessData).mockResolvedValue({
      members: [
        {
          userId: 'u1',
          role: 'admin',
          createdAt: '2026-03-01T00:00:00.000Z',
          email: 'alex@example.com',
          displayName: 'Alex',
          avatarUrl: null,
          initials: 'AL'
        }
      ],
      pendingInvites: []
    });

    const result = await loadProjectsPageData({ workspace: 'w1' });

    expect(result).toEqual(
      expect.objectContaining({
        mode: 'workspace-detail',
        currentUserId: 'u1',
        projects: [],
        templates: [],
        teamAccess: expect.objectContaining({
          members: expect.any(Array),
          pendingInvites: []
        }),
        onboarding: expect.objectContaining({
          primaryAction: {
            label: 'Create first project',
            href: '#create-project-form'
          }
        })
      })
    );
  });

  it('returns task-focused onboarding for an admin workspace with a first project', async () => {
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
    vi.mocked(getProjectTemplateSummaries).mockResolvedValue([
      {
        id: 'tpl1',
        workspaceId: 'w1',
        sourceProjectId: 'p-src',
        name: 'Sprint',
        description: 'Two-week sprint',
        includeTasks: true,
        taskCount: 3,
        createdBy: 'u1',
        createdAt: '2026-03-04T00:00:00.000Z'
      }
    ]);
    vi.mocked(loadWorkspaceTeamAccessData).mockResolvedValue({
      members: [
        {
          userId: 'u1',
          role: 'admin',
          createdAt: '2026-03-01T00:00:00.000Z',
          email: 'alex@example.com',
          displayName: 'Alex',
          avatarUrl: null,
          initials: 'AL'
        },
        {
          userId: 'u2',
          role: 'member',
          createdAt: '2026-03-01T00:00:00.000Z',
          email: 'sam@example.com',
          displayName: 'Sam',
          avatarUrl: null,
          initials: 'SA'
        }
      ],
      pendingInvites: []
    });

    const result = await loadProjectsPageData({ workspace: 'w1' });

    expect(result).toEqual(
      expect.objectContaining({
        mode: 'workspace-detail',
        currentUserId: 'u1',
        templates: [
          expect.objectContaining({
            id: 'tpl1'
          })
        ],
        onboarding: expect.objectContaining({
          primaryAction: {
            label: 'Open Core',
            href: '/projects/p1#project-setup-guide'
          },
          secondaryAction: {
            label: 'Review invites',
            href: '#team-access-panel'
          }
        })
      })
    );
  });

  it('hides onboarding once the admin workspace already has tasks', async () => {
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
        taskCount: 2,
        overdueCount: 0
      }
    ]);
    vi.mocked(getProjectTemplateSummaries).mockResolvedValue([]);
    vi.mocked(loadWorkspaceTeamAccessData).mockResolvedValue({
      members: [],
      pendingInvites: []
    });

    await expect(loadProjectsPageData({ workspace: 'w1' })).resolves.toEqual({
      mode: 'workspace-detail',
      currentUserId: 'u1',
      workspaces: [{ id: 'w1', name: 'Ops', icon: null, role: 'admin' }],
      activeWorkspace: { id: 'w1', name: 'Ops', icon: null, role: 'admin' },
      projects: [
        {
          id: 'p1',
          workspaceId: 'w1',
          name: 'Core',
          description: null,
          privacy: 'workspace_visible',
          taskCount: 2,
          overdueCount: 0
        }
      ],
      templates: [],
      teamAccess: {
        members: [],
        pendingInvites: []
      },
      onboarding: null
    });
  });

  it('does not return onboarding for non-admin workspaces', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: {} as never
    });
    vi.mocked(getWorkspacesForUser).mockResolvedValue([
      { id: 'w1', name: 'Ops', icon: null, role: 'member' }
    ]);
    vi.mocked(getProjectsForWorkspace).mockResolvedValue([]);
    vi.mocked(getProjectTemplateSummaries).mockResolvedValue([]);

    await expect(loadProjectsPageData({ workspace: 'w1' })).resolves.toEqual({
      mode: 'workspace-detail',
      currentUserId: 'u1',
      workspaces: [{ id: 'w1', name: 'Ops', icon: null, role: 'member' }],
      activeWorkspace: { id: 'w1', name: 'Ops', icon: null, role: 'member' },
      projects: [],
      templates: [],
      teamAccess: null,
      onboarding: null
    });
  });

  it('keeps onboarding available when team access data fails to load', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: {} as never
    });
    vi.mocked(getWorkspacesForUser).mockResolvedValue([
      { id: 'w1', name: 'Ops', icon: null, role: 'admin' }
    ]);
    vi.mocked(getProjectsForWorkspace).mockResolvedValue([]);
    vi.mocked(getProjectTemplateSummaries).mockResolvedValue([]);
    vi.mocked(loadWorkspaceTeamAccessData).mockRejectedValue(new Error('boom'));

    const result = await loadProjectsPageData({ workspace: 'w1' });

    expect(result).toEqual(
      expect.objectContaining({
        mode: 'workspace-detail',
        currentUserId: 'u1',
        templates: [],
        teamAccess: null,
        onboarding: expect.objectContaining({
          primaryAction: {
            label: 'Create first project',
            href: '#create-project-form'
          }
        })
      })
    );
  });
});
