import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMyTasks, getProjectTasks, getTaskById, getTaskComments } from '@/lib/domain/tasks/queries';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

function baseTask(overrides: Record<string, unknown> = {}) {
  return {
    id: 't1',
    project_id: 'p1',
    section_id: null,
    status_id: 's1',
    title: 'Task',
    description: null,
    assignee_id: 'u1',
    creator_id: 'u1',
    due_at: null,
    due_timezone: 'UTC',
    priority: null,
    parent_task_id: null,
    recurrence_id: null,
    is_today: false,
    sort_order: 1,
    completed_at: null,
    project: [{ id: 'p1', name: 'Project 1' }],
    status: [{ id: 's1', name: 'To do', color: '#111', is_done: false }],
    section: null,
    ...overrides
  };
}

describe('task queries', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('normalizes relation rows for project tasks', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: [
            baseTask({
              section: [{ id: 'sec-1', name: 'Backlog' }]
            })
          ]
        }
      }
    ]);

    const tasks = await getProjectTasks(supabase as never, 'p1');

    expect(tasks[0]?.project.name).toBe('Project 1');
    expect(tasks[0]?.section?.name).toBe('Backlog');
  });

  it('groups my tasks into today, upcoming, and overdue', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T09:00:00.000Z'));

    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: [
            baseTask({ id: 'today-flag', due_at: null, is_today: true }),
            baseTask({ id: 'overdue', due_at: '2026-02-14T12:00:00.000Z' }),
            baseTask({ id: 'today-date', due_at: '2026-02-15T12:00:00.000Z' }),
            baseTask({ id: 'upcoming', due_at: '2026-02-20T12:00:00.000Z' }),
            baseTask({ id: 'done', completed_at: '2026-02-15T08:00:00.000Z', due_at: '2026-02-15T12:00:00.000Z' })
          ]
        }
      }
    ]);

    const grouped = await getMyTasks(supabase as never, {
      userId: 'u1',
      projectIds: ['p1']
    });

    expect(grouped.today.map((task) => task.id).sort()).toEqual(['today-date', 'today-flag']);
    expect(grouped.overdue.map((task) => task.id)).toEqual(['overdue']);
    expect(grouped.upcoming['2026-02-20']?.map((task) => task.id)).toEqual(['upcoming']);
  });

  it('applies status and quick filters to workspace-scoped my tasks', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T09:00:00.000Z'));

    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: [
            baseTask({ id: 'waiting', is_today: true, status_id: 'waiting-id', status: [{ id: 'waiting-id', name: 'Waiting', color: '#b66a00', is_done: false }] }),
            baseTask({ id: 'overdue', due_at: '2026-02-14T10:00:00.000Z' }),
            baseTask({ id: 'week', due_at: '2026-02-18T10:00:00.000Z' }),
            baseTask({ id: 'later', due_at: '2026-03-02T10:00:00.000Z' })
          ]
        }
      },
      {
        table: 'tasks',
        response: {
          data: [
            baseTask({ id: 'waiting', is_today: true, status_id: 'waiting-id', status: [{ id: 'waiting-id', name: 'Waiting', color: '#b66a00', is_done: false }] }),
            baseTask({ id: 'overdue', due_at: '2026-02-14T10:00:00.000Z' }),
            baseTask({ id: 'week', due_at: '2026-02-18T10:00:00.000Z' }),
            baseTask({ id: 'later', due_at: '2026-03-02T10:00:00.000Z' })
          ]
        }
      },
      {
        table: 'tasks',
        response: {
          data: [
            baseTask({ id: 'unassigned', assignee_id: null, due_at: '2026-02-17T10:00:00.000Z' })
          ]
        }
      }
    ]);

    const waiting = await getMyTasks(supabase as never, {
      userId: 'u1',
      projectIds: ['p1'],
      statusIds: ['waiting-id'],
      quickFilter: 'waiting'
    });
    const dueThisWeek = await getMyTasks(supabase as never, {
      userId: 'u1',
      projectIds: ['p1'],
      quickFilter: 'due-this-week'
    });
    const unassigned = await getMyTasks(supabase as never, {
      userId: 'u1',
      projectIds: ['p1'],
      quickFilter: 'unassigned'
    });

    expect(waiting.today.map((task) => task.id)).toEqual(['waiting']);
    expect(dueThisWeek.overdue).toEqual([]);
    expect(dueThisWeek.upcoming['2026-02-18']?.map((task) => task.id)).toEqual(['week']);
    expect(dueThisWeek.upcoming['2026-03-02']).toBeUndefined();
    expect(unassigned.upcoming['2026-02-17']?.map((task) => task.id)).toEqual(['unassigned']);
  });

  it('returns null when task does not exist', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: { data: null, error: null }
      }
    ]);

    const task = await getTaskById(supabase as never, 'missing');
    expect(task).toBeNull();
  });

  it('returns comments in stable order', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'task_comments',
        response: {
          data: [
            { id: 'c1', task_id: 't1', user_id: 'u1', body: 'first', created_at: '2026-02-15T10:00:00.000Z' }
          ]
        }
      }
    ]);

    const comments = await getTaskComments(supabase as never, 't1');
    expect((comments as any)[0]?.body).toBe('first');
  });
});
