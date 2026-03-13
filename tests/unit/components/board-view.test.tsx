import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BoardView } from '@/app/components/projects/board-view';
import { createTaskAction, moveTaskAction, updateTaskAction } from '@/lib/actions/task-actions';

const refresh = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh
  })
}));
vi.mock('@/lib/actions/task-actions', () => ({
  createTaskAction: vi.fn(async () => ({ ok: true, data: { taskId: 't2' } })),
  moveTaskAction: vi.fn(async () => ({ ok: true, data: { taskId: 't1', sortOrder: 12 } })),
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
  beforeEach(() => {
    vi.clearAllMocks();
    refresh.mockReset();
  });

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
      expect(moveTaskAction).toHaveBeenCalledWith({ id: 't1', statusId: 'done' });
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

  it('creates a card inline for a board column and refreshes the route', async () => {
    render(
      <BoardView
        projectId="p1"
        drawerPathname="/projects/p1"
        assignees={assignees}
        statuses={[{ id: 'todo', name: 'To do', color: '#000' }]}
        tasks={[]}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add card' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Quick add card in To do' }), {
      target: { value: 'New board card' }
    });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Quick add card in To do' }), {
      key: 'Enter'
    });

    await waitFor(() => {
      expect(createTaskAction).toHaveBeenCalledWith({
        projectId: 'p1',
        statusId: 'todo',
        title: 'New board card'
      });
    });
    expect(refresh).toHaveBeenCalled();
  });

  it('renders due metadata and risk signals on cards', () => {
    render(
      <BoardView
        projectId="p1"
        drawerPathname="/projects/p1"
        assignees={assignees}
        statuses={[{ id: 'waiting', name: 'Waiting', color: '#b66a00' }]}
        tasks={[
          {
            id: 't1',
            project_id: 'p1',
            section_id: null,
            status_id: 'waiting',
            title: 'Task A',
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
            status: { id: 'waiting', name: 'Waiting', color: '#b66a00', is_done: false },
            section: null
          }
        ]}
      />
    );

    expect(screen.getByText('Sat, Feb 14')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getAllByText('Waiting')[0]).toBeInTheDocument();
    expect(screen.getByText('high')).toBeInTheDocument();
  });
});
