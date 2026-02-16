import { describe, expect, it } from 'vitest';
import { generateDueNotifications } from '@/lib/domain/inbox/scheduler';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

describe('generateDueNotifications', () => {
  it('creates due-soon and overdue notifications while skipping existing rows', async () => {
    const now = new Date('2026-02-15T12:00:00.000Z');

    const { supabase, history } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: [
            {
              id: 'task-due-soon',
              due_at: '2026-02-15T14:00:00.000Z',
              assignee_id: 'user-1',
              completed_at: null,
              status_id: 'status-open',
              project_id: 'project-1'
            },
            {
              id: 'task-overdue',
              due_at: '2026-02-15T11:00:00.000Z',
              assignee_id: 'user-2',
              completed_at: null,
              status_id: 'status-open',
              project_id: 'project-1'
            },
            {
              id: 'task-later',
              due_at: '2026-02-16T18:00:00.000Z',
              assignee_id: 'user-3',
              completed_at: null,
              status_id: 'status-open',
              project_id: 'project-1'
            },
            {
              id: 'task-done-status',
              due_at: '2026-02-15T10:00:00.000Z',
              assignee_id: 'user-4',
              completed_at: null,
              status_id: 'status-done',
              project_id: 'project-1'
            },
            {
              id: 'task-without-assignee',
              due_at: '2026-02-15T10:00:00.000Z',
              assignee_id: null,
              completed_at: null,
              status_id: 'status-open',
              project_id: 'project-1'
            },
            {
              id: 'task-completed',
              due_at: '2026-02-15T10:00:00.000Z',
              assignee_id: 'user-5',
              completed_at: '2026-02-15T09:30:00.000Z',
              status_id: 'status-open',
              project_id: 'project-1'
            },
            {
              id: 'task-invalid-due',
              due_at: 'not-a-date',
              assignee_id: 'user-6',
              completed_at: null,
              status_id: 'status-open',
              project_id: 'project-1'
            }
          ],
          error: null
        }
      },
      {
        table: 'project_statuses',
        response: {
          data: [
            { id: 'status-open', is_done: false },
            { id: 'status-done', is_done: true }
          ],
          error: null
        }
      },
      {
        table: 'projects',
        response: {
          data: [{ id: 'project-1', workspace_id: 'workspace-1' }],
          error: null
        }
      },
      {
        table: 'notifications',
        response: {
          data: [{ user_id: 'user-2', entity_id: 'task-overdue', type: 'overdue' }],
          error: null
        }
      },
      {
        table: 'notifications',
        response: { data: null, error: null }
      }
    ]);

    const summary = await generateDueNotifications(supabase as never, { now });

    expect(summary).toEqual({
      scanned: 7,
      candidates: 2,
      created: 1,
      skipped: 1
    });

    const insertRows = history[4]?.chain.insert.mock.calls[0]?.[0];
    expect(insertRows).toEqual([
      expect.objectContaining({
        workspace_id: 'workspace-1',
        user_id: 'user-1',
        type: 'due_soon',
        entity_type: 'task',
        entity_id: 'task-due-soon',
        channel: 'in_app'
      })
    ]);
  });

  it('returns zero summary when no due candidates exist', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: [
            {
              id: 'task-later',
              due_at: '2026-02-17T12:00:00.000Z',
              assignee_id: 'user-1',
              completed_at: null,
              status_id: 'status-open',
              project_id: 'project-1'
            }
          ],
          error: null
        }
      },
      {
        table: 'project_statuses',
        response: {
          data: [{ id: 'status-open', is_done: false }],
          error: null
        }
      },
      {
        table: 'projects',
        response: {
          data: [{ id: 'project-1', workspace_id: 'workspace-1' }],
          error: null
        }
      }
    ]);

    const summary = await generateDueNotifications(supabase as never, {
      now: new Date('2026-02-15T12:00:00.000Z')
    });

    expect(summary).toEqual({
      scanned: 1,
      candidates: 0,
      created: 0,
      skipped: 0
    });
    expect(history).toHaveLength(3);
  });
});
