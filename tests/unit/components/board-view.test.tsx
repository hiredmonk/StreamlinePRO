import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BoardView } from '@/app/components/projects/board-view';
import { moveTaskAction, updateTaskAction } from '@/lib/actions/task-actions';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh
  })
}));
vi.mock('@/lib/actions/task-actions', () => ({
  moveTaskAction: vi.fn(async () => ({ ok: true, data: { taskId: 't1' } })),
  updateTaskAction: vi.fn(async () => ({ ok: true, data: { taskId: 't1' } }))
}));

const assignees = [
  {
    userId: 'u1',
    email: 'alex@example.com',
    displayName: 'Alex',
    avatarUrl: null,
    initials: 'AL'
  }
];

describe('BoardView', () => {
  it('moves task between status columns on drop', async () => {
    render(
      <BoardView
        projectId="p1"
        drawerPathname="/projects/p1"
        assignees={assignees}
        statuses={[
          { id: 'todo', name: 'To do', color: '#000' },
          { id: 'done', name: 'Done', color: '#0a0' }
        ]}
        tasks={[
          {
            id: 't1',
            project_id: 'p1',
            section_id: null,
            status_id: 'todo',
            title: 'Task A',
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
            status: { id: 'todo', name: 'To do', color: '#000', is_done: false },
            section: null
          }
        ]}
      />
    );

    const dropZone = screen.getByText('Drop tasks here').closest('div');
    expect(dropZone).toBeTruthy();

    fireEvent.drop(dropZone as Element, {
      dataTransfer: {
        getData: () => 't1'
      }
    });

    await waitFor(() => {
      expect(moveTaskAction).toHaveBeenCalledWith({ id: 't1', statusId: 'done', sortOrder: 1 });
    });
  });

  it('updates assignee inline and refreshes the route', async () => {
    render(
      <BoardView
        projectId="p1"
        drawerPathname="/projects/p1"
        assignees={assignees}
        statuses={[{ id: 'todo', name: 'To do', color: '#000' }]}
        tasks={[
          {
            id: 't1',
            project_id: 'p1',
            section_id: null,
            status_id: 'todo',
            title: 'Task A',
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
            status: { id: 'todo', name: 'To do', color: '#000', is_done: false },
            section: null
          }
        ]}
      />
    );

    fireEvent.change(screen.getByRole('combobox', { name: 'Assignee for Task A' }), {
      target: { value: 'u1' }
    });

    await waitFor(() => {
      expect(updateTaskAction).toHaveBeenCalledWith({ id: 't1', assigneeId: 'u1' });
    });
    expect(refresh).toHaveBeenCalled();
  });
});
