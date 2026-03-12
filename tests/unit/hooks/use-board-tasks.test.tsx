import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBoardTasks } from '@/lib/hooks/use-board-tasks';

const statuses = [
  { id: 'todo', name: 'To do', color: '#111111' },
  { id: 'done', name: 'Done', color: '#22aa44' }
];

const tasks = [
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
    status: { id: 'todo', name: 'To do', color: '#111111', is_done: false },
    section: null
  }
];

describe('useBoardTasks', () => {
  it('optimistically moves a task and calls the mutation', async () => {
    const moveTask = vi.fn(async () => ({ ok: true }));
    const { result } = renderHook(() => useBoardTasks({ tasks, statuses, moveTask }));

    await act(async () => {
      await result.current.moveTask('t1', 'done');
    });

    expect(moveTask).toHaveBeenCalledWith({
      id: 't1',
      statusId: 'done',
      sortOrder: 1
    });
    expect(result.current.columns[1].items[0]?.status_id).toBe('done');
  });

  it('rolls back the optimistic move when the mutation fails', async () => {
    const moveTask = vi.fn(async () => ({ ok: false }));
    const { result } = renderHook(() => useBoardTasks({ tasks, statuses, moveTask }));

    await act(async () => {
      await result.current.moveTask('t1', 'done');
    });

    await waitFor(() => {
      expect(result.current.columns[0].items[0]?.status_id).toBe('todo');
    });
  });

  it('resyncs local items when tasks prop changes', async () => {
    const moveTask = vi.fn(async () => ({ ok: true }));
    const { result, rerender } = renderHook(
      ({ currentTasks }) => useBoardTasks({ tasks: currentTasks, statuses, moveTask }),
      { initialProps: { currentTasks: tasks } }
    );

    rerender({
      currentTasks: [
        {
          ...tasks[0],
          id: 't2',
          title: 'Task B',
          status_id: 'done',
          status: { ...tasks[0].status, id: 'done', name: 'Done', color: '#22aa44' }
        }
      ]
    });

    await waitFor(() => {
      expect(result.current.columns[1].items[0]?.id).toBe('t2');
    });
  });
});
