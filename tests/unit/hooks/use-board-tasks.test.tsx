import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useBoardTasks } from '@/lib/hooks/use-board-tasks';

vi.mock('@/lib/actions/task-actions', () => ({
  moveTaskWithConcurrencyAction: vi.fn()
}));

import { moveTaskWithConcurrencyAction } from '@/lib/actions/task-actions';

const statuses = [
  { id: 'todo', name: 'To do', color: '#111111' },
  { id: 'done', name: 'Done', color: '#22aa44' }
];

const statusesWithVersions = [
  { id: 'todo', name: 'To do', color: '#111111', laneVersion: 0 },
  { id: 'done', name: 'Done', color: '#22aa44', laneVersion: 0 }
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

const twoLaneTasks = [
  tasks[0],
  {
    ...tasks[0],
    id: 'done-1',
    title: 'Done task',
    status_id: 'done',
    sort_order: 17,
    status: { ...tasks[0].status, id: 'done', name: 'Done', color: '#22aa44' }
  }
];

describe('useBoardTasks', () => {
  it('optimistically appends a task and reconciles to the canonical rank', async () => {
    const moveTask = vi.fn(async () => ({ ok: true as const, data: { sortOrder: 42 } }));
    const { result, unmount } = renderHook(() => useBoardTasks({ tasks, statuses, moveTask }));

    await act(async () => {
      await result.current.moveTask('t1', 'done');
    });

    expect(moveTask).toHaveBeenCalledWith({ id: 't1', statusId: 'done' });
    expect(result.current.columns[1].items[0]?.status_id).toBe('done');
    expect(result.current.columns[1].items[0]?.sort_order).toBe(42);

    unmount();
  });

  it('rolls back the optimistic move when the mutation fails', async () => {
    const moveTask = vi.fn(async () => ({ ok: false as const }));
    const { result, unmount } = renderHook(() => useBoardTasks({ tasks, statuses, moveTask }));

    await act(async () => {
      await result.current.moveTask('t1', 'done');
    });

    expect(result.current.columns[0].items[0]?.status_id).toBe('todo');

    unmount();
  });

  it('resyncs local items when tasks prop changes', () => {
    const moveTask = vi.fn(async () => ({ ok: true as const, data: { sortOrder: 99 } }));
    const { result, rerender, unmount } = renderHook(
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

    expect(result.current.columns[1].items[0]?.id).toBe('t2');

    unmount();
  });

  it('uses the lane max rank for optimistic append placement before reconciliation', async () => {
    const moveTask = vi.fn(async () => ({ ok: true as const, data: { sortOrder: 50 } }));
    const { result, unmount } = renderHook(() =>
      useBoardTasks({
        tasks: twoLaneTasks,
        statuses,
        moveTask
      })
    );

    await act(async () => {
      await result.current.moveTask('t1', 'done');
    });

    expect(result.current.columns[1].items.map((task) => task.id)).toEqual(['done-1', 't1']);
    expect(result.current.columns[1].items[1]?.sort_order).toBe(50);

    unmount();
  });

  describe('concurrency mode', () => {
    it('initializes lane versions from statuses', () => {
      const moveTask = vi.fn(async () => ({ ok: true as const, data: { sortOrder: 1 } }));
      const { result, unmount } = renderHook(() =>
        useBoardTasks({ tasks, statuses: statusesWithVersions, moveTask, projectId: 'p1' })
      );

      expect(result.current.laneVersions).toEqual({ todo: 0, done: 0 });

      unmount();
    });

    it('updates both destination and source lane versions on cross-lane move', async () => {
      const moveTask = vi.fn(async () => ({ ok: true as const, data: { sortOrder: 1 } }));
      vi.mocked(moveTaskWithConcurrencyAction).mockResolvedValue({
        ok: true,
        data: {
          taskId: 't1',
          projectId: 'p1',
          statusId: 'done',
          sectionId: null,
          sortOrder: 1,
          laneVersion: 1,
          sourceLaneVersion: 1,
          sourceStatusId: 'todo'
        }
      });

      const { result, unmount } = renderHook(() =>
        useBoardTasks({ tasks, statuses: statusesWithVersions, moveTask, projectId: 'p1' })
      );

      await act(async () => {
        await result.current.moveTask('t1', 'done');
      });

      expect(result.current.laneVersions.done).toBe(1);
      expect(result.current.laneVersions.todo).toBe(1);

      unmount();
    });

    it('rolls back and shows message on conflict', async () => {
      const moveTask = vi.fn(async () => ({ ok: true as const, data: { sortOrder: 1 } }));
      vi.mocked(moveTaskWithConcurrencyAction).mockResolvedValue({
        ok: true,
        data: {
          taskId: 't1',
          projectId: 'p1',
          statusId: 'todo',
          sectionId: null,
          sortOrder: 1,
          laneVersion: 2,
          conflict: {
            projectId: 'p1',
            statusId: 'done',
            expectedVersion: 0,
            actualVersion: 2,
            reason: 'version_mismatch'
          }
        }
      });

      const { result, unmount } = renderHook(() =>
        useBoardTasks({ tasks, statuses: statusesWithVersions, moveTask, projectId: 'p1' })
      );

      await act(async () => {
        await result.current.moveTask('t1', 'done');
      });

      // Task should be rolled back to original status
      expect(result.current.columns[0].items[0]?.status_id).toBe('todo');
      expect(result.current.boardMessage).toContain('version_mismatch');

      act(() => {
        result.current.clearBoardMessage();
      });

      expect(result.current.boardMessage).toBeNull();

      unmount();
    });
  });
});
