import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getTaskCardMeta } from '@/lib/view-models/task-card';

function buildTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    project_id: 'p1',
    section_id: null,
    status_id: 'todo',
    title: 'Task',
    description: null,
    assignee_id: null,
    creator_id: 'u1',
    due_at: null,
    due_timezone: 'UTC',
    priority: null,
    parent_task_id: null,
    recurrence_id: null,
    is_today: false,
    sort_order: 1,
    completed_at: null,
    project: { id: 'p1', name: 'Project 1' },
    status: { id: 'todo', name: 'To do', color: '#111', is_done: false },
    section: null,
    ...overrides
  };
}

describe('getTaskCardMeta', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns stable fallback metadata when there is no due date', () => {
    expect(getTaskCardMeta(buildTask())).toEqual({
      dueLabel: 'No due date',
      relativeDueLabel: null,
      isOverdue: false,
      isWaiting: false,
      priority: null
    });
  });

  it('marks overdue tasks and normalizes waiting statuses', () => {
    const meta = getTaskCardMeta(
      buildTask({
        due_at: '2026-02-14T09:00:00.000Z',
        priority: 'high',
        status: { id: 'waiting', name: ' Waiting ', color: '#b66a00', is_done: false }
      })
    );

    expect(meta.dueLabel).toBe('Sat, Feb 14');
    expect(meta.relativeDueLabel).toBe('1 day ago');
    expect(meta.isOverdue).toBe(true);
    expect(meta.isWaiting).toBe(true);
    expect(meta.priority).toBe('high');
  });
});
