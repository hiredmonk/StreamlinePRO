import { describe, expect, it, vi } from 'vitest';
import { buildProjectTaxonomyMaps, loadMyTasksPageData } from '@/lib/page-loaders/my-tasks-page';
import { requireUser } from '@/lib/auth';
import { getProjectsForWorkspace, getWorkspacesForUser } from '@/lib/domain/projects/queries';
import { getMyTasks } from '@/lib/domain/tasks/queries';
import { loadTaskDrawerData } from '@/lib/page-loaders/task-drawer';

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn()
}));
vi.mock('@/lib/domain/projects/queries', () => ({
  getProjectsForWorkspace: vi.fn(),
  getWorkspacesForUser: vi.fn()
}));
vi.mock('@/lib/domain/tasks/queries', () => ({
  getMyTasks: vi.fn()
}));
vi.mock('@/lib/page-loaders/task-drawer', () => ({
  loadTaskDrawerData: vi.fn()
}));

function createSupabaseMock() {
  return {
    from(table: string) {
      return {
        select() {
          return {
            in() {
              return {
                order() {
                  if (table === 'project_statuses') {
                    return Promise.resolve({
                      data: [{ id: 'todo', project_id: 'p1', name: 'To do', color: '#111111' }],
                      error: null
                    });
                  }

                  return Promise.resolve({
                    data: [{ id: 'sec1', project_id: 'p1', name: 'Backlog' }],
                    error: null
                  });
                }
              };
            }
          };
        }
      };
    }
  } as never;
}

describe('loadMyTasksPageData', () => {
  it('returns no-workspaces when the user has none', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' },
      supabase: createSupabaseMock()
    });
    vi.mocked(getWorkspacesForUser).mockResolvedValue([]);

    await expect(loadMyTasksPageData({})).resolves.toEqual({ mode: 'no-workspaces' });
  });

  it('builds page state from grouped tasks and selected drawer data', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' },
      supabase: createSupabaseMock()
    });
    vi.mocked(getWorkspacesForUser).mockResolvedValue([
      { id: 'w1', name: 'Ops', icon: '⚙', role: 'admin' }
    ]);
    vi.mocked(getProjectsForWorkspace).mockResolvedValue([
      {
        id: 'p1',
        workspaceId: 'w1',
        name: 'Core',
        description: null,
        privacy: 'workspace_visible',
        taskCount: 1,
        overdueCount: 0
      }
    ]);
    vi.mocked(getMyTasks).mockResolvedValue({
      today: [],
      overdue: [
        {
          id: 't1',
          project_id: 'p1',
          section_id: null,
          status_id: 'todo',
          title: 'Pay vendors',
          description: null,
          assignee_id: 'u1',
          creator_id: 'u1',
          due_at: '2026-02-14T10:00:00.000Z',
          due_timezone: 'UTC',
          priority: 'high',
          parent_task_id: null,
          recurrence_id: null,
          is_today: false,
          sort_order: 1,
          completed_at: null,
          project: { id: 'p1', name: 'Core' },
          status: { id: 'todo', name: 'To do', color: '#111111', is_done: false },
          section: null
        }
      ],
      upcoming: {}
    });
    vi.mocked(loadTaskDrawerData).mockResolvedValue(null);

    const result = await loadMyTasksPageData({ task: 't1' });

    expect(result).toMatchObject({
      mode: 'ready',
      hasAnyTask: true,
      quickAddProjects: [{ id: 'p1', name: 'Core' }],
      statusesByProject: { p1: [{ id: 'todo', name: 'To do', color: '#111111' }] },
      sectionsByProject: { p1: [{ id: 'sec1', name: 'Backlog' }] }
    });
    expect(loadTaskDrawerData).toHaveBeenCalledWith(expect.anything(), 't1');
  });
});

describe('buildProjectTaxonomyMaps', () => {
  it('groups statuses and sections by project id', () => {
    expect(
      buildProjectTaxonomyMaps(
        [{ id: 'todo', project_id: 'p1', name: 'To do', color: '#111111' }],
        [{ id: 'sec1', project_id: 'p1', name: 'Backlog' }]
      )
    ).toEqual({
      statusesByProject: {
        p1: [{ id: 'todo', name: 'To do', color: '#111111' }]
      },
      sectionsByProject: {
        p1: [{ id: 'sec1', name: 'Backlog' }]
      }
    });
  });
});
