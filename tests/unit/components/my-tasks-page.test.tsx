import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MyTasksPage from '@/app/(app)/my-tasks/page';
import { loadMyTasksPageData } from '@/lib/page-loaders/my-tasks-page';

vi.mock('@/lib/page-loaders/my-tasks-page', () => ({
  loadMyTasksPageData: vi.fn()
}));
vi.mock('@/app/components/tasks/my-tasks-filters', () => ({
  MyTasksFilters: () => <div>Filters</div>
}));
vi.mock('@/app/components/tasks/quick-add-form', () => ({
  QuickAddForm: () => <form>Quick Add</form>
}));
vi.mock('@/app/components/ui/empty-state', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>
}));
vi.mock('@/app/components/tasks/task-row', () => ({
  TaskRow: ({ drawerHref, completionReturnTo }: { drawerHref?: string; completionReturnTo?: string }) => (
    <div
      data-testid="task-row"
      data-drawer-href={drawerHref}
      data-completion-return-to={completionReturnTo}
    >
      Task Row
    </div>
  )
}));
vi.mock('@/app/components/tasks/task-drawer-panel', () => ({
  TaskDrawerPanel: ({
    completionReturnTo,
    closeHref,
    mode,
    recurringNotice
  }: {
    completionReturnTo?: string;
    closeHref: string;
    mode?: string;
    recurringNotice?: string | null;
  }) => (
    <aside
      data-testid="task-drawer"
      data-completion-return-to={completionReturnTo}
      data-close-href={closeHref}
      data-mode={mode}
      data-recurring-notice={recurringNotice ?? ''}
    >
      Drawer
    </aside>
  )
}));

describe('MyTasksPage', () => {
  it('keeps filter state while clearing stale completion params in list and drawer links', async () => {
    vi.mocked(loadMyTasksPageData).mockResolvedValue({
      mode: 'ready',
      currentUserId: 'u1',
      groups: {
        today: [
          {
            id: 't1',
            project_id: 'p1',
            section_id: null,
            status_id: 's1',
            title: 'Pay vendors',
            description: null,
            assignee_id: 'u1',
            creator_id: 'u1',
            due_at: null,
            due_timezone: 'UTC',
            priority: null,
            parent_task_id: null,
            recurrence_id: null,
            is_today: true,
            sort_order: 1,
            completed_at: null,
            project: { id: 'p1', name: 'Core' },
            status: { id: 's1', name: 'Waiting', color: '#111111', is_done: false },
            section: null
          }
        ],
        overdue: [],
        upcoming: {}
      },
      filterState: {
        activeWorkspaceId: 'w1',
        workspaceOptions: [{ id: 'w1', name: 'Ops' }],
        projectOptions: [{ id: 'p1', name: 'Core' }],
        statusOptions: [{ id: 's1', name: 'Waiting', label: 'Core - Waiting' }],
        selectedProjectId: null,
        selectedStatusId: null,
        selectedQuickFilter: 'waiting',
        hasActiveFilters: true
      },
      quickAddProjects: [{ id: 'p1', name: 'Core' }],
      statusesByProject: {
        p1: [{ id: 's1', name: 'Waiting', color: '#111111' }]
      },
      sectionsByProject: {
        p1: []
      },
      assigneesByProject: {
        p1: []
      },
      selectedTaskPanel: {
        task: {
          id: 't1',
          project_id: 'p1',
          section_id: null,
          status_id: 's1',
          title: 'Pay vendors',
          description: null,
          assignee_id: 'u1',
          creator_id: 'u1',
          due_at: null,
          due_timezone: 'UTC',
          priority: null,
          parent_task_id: null,
          recurrence_id: null,
          is_today: true,
          sort_order: 1,
          completed_at: null,
          project: { id: 'p1', name: 'Core' },
          status: { id: 's1', name: 'Waiting', color: '#111111', is_done: false },
          section: null
        },
        subtasks: [],
        comments: [],
        attachments: [],
        activity: []
      },
      selectedTaskMode: 'completed',
      recurringNotice: 'The recurring series already generated the next task.',
      hasAnyTask: true
    } as never);

    render(
      await MyTasksPage({
        searchParams: Promise.resolve({
          workspace: 'w1',
          quick: 'waiting',
          task: 'older-task',
          completed: '1',
          recurring: '1'
        })
      })
    );

    const row = screen.getByTestId('task-row');
    const drawer = screen.getByTestId('task-drawer');

    expect(row).toHaveAttribute('data-drawer-href', '/my-tasks?workspace=w1&quick=waiting&task=t1');
    expect(row).toHaveAttribute(
      'data-completion-return-to',
      '/my-tasks?workspace=w1&quick=waiting&task=t1&completed=1'
    );
    expect(drawer).toHaveAttribute(
      'data-completion-return-to',
      '/my-tasks?workspace=w1&quick=waiting&task=t1&completed=1'
    );
    expect(drawer).toHaveAttribute('data-close-href', '/my-tasks?workspace=w1&quick=waiting');
    expect(drawer).toHaveAttribute('data-mode', 'completed');
    expect(drawer).toHaveAttribute(
      'data-recurring-notice',
      'The recurring series already generated the next task.'
    );
  });
});
