import { describe, expect, it, vi } from 'vitest';
import { buildProjectWorkflowOptions, loadProjectDetailPageData } from '@/lib/page-loaders/project-detail-page';
import { requireUser } from '@/lib/auth';
import { getProjectById, getProjectSections, getProjectStatuses } from '@/lib/domain/projects/queries';
import { getProjectTasks, getTaskById } from '@/lib/domain/tasks/queries';
import { loadProjectAssignees } from '@/lib/page-loaders/project-assignees';
import { loadTaskDrawerDataForTask } from '@/lib/page-loaders/task-drawer';

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn()
}));
vi.mock('@/lib/domain/projects/queries', () => ({
  getProjectById: vi.fn(),
  getProjectSections: vi.fn(),
  getProjectStatuses: vi.fn()
}));
vi.mock('@/lib/domain/tasks/queries', () => ({
  getProjectTasks: vi.fn(),
  getTaskById: vi.fn()
}));
vi.mock('@/lib/page-loaders/task-drawer', () => ({
  loadTaskDrawerDataForTask: vi.fn()
}));
vi.mock('@/lib/page-loaders/project-assignees', () => ({
  loadProjectAssignees: vi.fn()
}));

describe('loadProjectDetailPageData', () => {
  it('returns null when the project does not exist', async () => {
    vi.mocked(requireUser).mockResolvedValue({ user: {} as never, supabase: {} as never });
    vi.mocked(getProjectById).mockResolvedValue(null);

    await expect(loadProjectDetailPageData('missing', {})).resolves.toBeNull();
  });

  it('ignores a selected task from another project and returns assignee options', async () => {
    vi.mocked(requireUser).mockResolvedValue({ user: {} as never, supabase: {} as never });
    vi.mocked(getProjectById).mockResolvedValue({
      id: 'p1',
      workspaceId: 'w1',
      name: 'Core',
      description: null,
      privacy: 'workspace_visible',
      taskCount: 1,
      overdueCount: 0
    });
    vi.mocked(getProjectStatuses).mockResolvedValue([
      { id: 'todo', name: 'To do', color: '#111111', is_done: false, sort_order: 0 }
    ]);
    vi.mocked(getProjectSections).mockResolvedValue([{ id: 'sec1', name: 'Backlog', sort_order: 0 }]);
    vi.mocked(getProjectTasks).mockResolvedValue([]);
    vi.mocked(loadProjectAssignees).mockResolvedValue({
      p1: [
        {
          userId: 'u1',
          email: 'alex@example.com',
          displayName: 'Alex',
          avatarUrl: null,
          initials: 'AL'
        }
      ]
    });
    vi.mocked(getTaskById).mockResolvedValue({
      id: 't1',
      project_id: 'p2',
      section_id: null,
      status_id: 'todo',
      title: 'Other',
      description: null,
      assignee_id: null,
      creator_id: 'u1',
      due_at: null,
      due_timezone: null,
      priority: null,
      parent_task_id: null,
      recurrence_id: null,
      is_today: false,
      sort_order: 1,
      completed_at: null,
      project: { id: 'p2', name: 'Other' },
      status: { id: 'todo', name: 'To do', color: '#111111', is_done: false },
      section: null
    });

    const result = await loadProjectDetailPageData('p1', { task: 't1' });

    expect(result?.assignees).toEqual([
      {
        userId: 'u1',
        email: 'alex@example.com',
        displayName: 'Alex',
        avatarUrl: null,
        initials: 'AL'
      }
    ]);
    expect(result?.setupGuide).toEqual({
      title: 'Set up this project in two quick steps',
      description: 'Review the workflow lanes first, then add and assign the first task without leaving the page.',
      actions: [
        { label: 'Review status lanes', href: '#workflow-status-manager' },
        { label: 'Add first task', href: '#quick-add-form' }
      ],
      tips: [
        'Use Waiting for blocked or external-dependency work so stuck tasks do not stay mixed into active execution.',
        'Done lanes are the completion targets, and you can assign the first task directly from the row, board card, or drawer.'
      ]
    });
    expect(result?.selectedTaskPanel).toBeNull();
    expect(loadTaskDrawerDataForTask).not.toHaveBeenCalled();
  });

  it('omits the setup guide when the project already has tasks', async () => {
    vi.mocked(requireUser).mockResolvedValue({ user: {} as never, supabase: {} as never });
    vi.mocked(getProjectById).mockResolvedValue({
      id: 'p1',
      workspaceId: 'w1',
      name: 'Core',
      description: null,
      privacy: 'workspace_visible',
      taskCount: 1,
      overdueCount: 0
    });
    vi.mocked(getProjectStatuses).mockResolvedValue([
      { id: 'todo', name: 'To do', color: '#111111', is_done: false, sort_order: 0 }
    ]);
    vi.mocked(getProjectSections).mockResolvedValue([{ id: 'sec1', name: 'Backlog', sort_order: 0 }]);
    vi.mocked(getProjectTasks).mockResolvedValue([
      {
        id: 't1',
        project_id: 'p1',
        section_id: null,
        status_id: 'todo',
        title: 'Task',
        description: null,
        assignee_id: null,
        creator_id: 'u1',
        due_at: null,
        due_timezone: null,
        priority: null,
        parent_task_id: null,
        recurrence_id: null,
        is_today: false,
        sort_order: 1,
        completed_at: null,
        project: { id: 'p1', name: 'Core' },
        status: { id: 'todo', name: 'To do', color: '#111111', is_done: false },
        section: null
      }
    ]);
    vi.mocked(loadProjectAssignees).mockResolvedValue({ p1: [] });
    vi.mocked(getTaskById).mockResolvedValue(null);

    const result = await loadProjectDetailPageData('p1', {});

    expect(result?.setupGuide).toBeNull();
  });
});

describe('buildProjectWorkflowOptions', () => {
  it('normalizes task and board option groups', () => {
    expect(
      buildProjectWorkflowOptions(
        [{ id: 'todo', name: 'To do', color: '#111111', is_done: false }],
        [{ id: 'sec1', name: 'Backlog' }]
      )
    ).toEqual({
      taskStatuses: [{ id: 'todo', name: 'To do' }],
      taskSections: [{ id: 'sec1', name: 'Backlog' }],
      boardStatuses: [{ id: 'todo', name: 'To do', color: '#111111' }],
      managerStatuses: [{ id: 'todo', name: 'To do', color: '#111111', is_done: false }]
    });
  });
});
