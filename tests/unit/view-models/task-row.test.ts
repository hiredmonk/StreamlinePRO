import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getTaskRowMeta } from '@/lib/view-models/task-row';

describe('getTaskRowMeta', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
  });

  it('computes overdue and relative due labels', () => {
    const result = getTaskRowMeta({
      id: 't1',
      project_id: 'p1',
      section_id: 'sec1',
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
      project: { id: 'p1', name: 'Finance' },
      status: { id: 'todo', name: 'To do', color: '#111', is_done: false },
      section: { id: 'sec1', name: 'Backlog' }
    });

    expect(result.isOverdue).toBe(true);
    expect(result.relativeDueLabel).toContain('ago');
    expect(result.sectionLabel).toBe('Backlog');
  });
});
