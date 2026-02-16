import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addCommentAction,
  completeTaskAction,
  createTaskAction,
  moveTaskAction,
  updateTaskAction,
  uploadTaskAttachmentAction
} from '@/lib/actions/task-actions';
import { requireUser } from '@/lib/auth';
import { createNotification } from '@/lib/domain/inbox/events';
import { getServerEnv } from '@/lib/env';
import { revalidatePath } from 'next/cache';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/lib/domain/inbox/events', () => ({ createNotification: vi.fn(async () => undefined) }));
vi.mock('@/lib/env', () => ({ getServerEnv: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const ids = {
  userA: '11111111-1111-4111-8111-111111111111',
  userB: '22222222-2222-4222-8222-222222222222',
  userC: '33333333-3333-4333-8333-333333333333',
  workspace: '44444444-4444-4444-8444-444444444444',
  project: '55555555-5555-4555-8555-555555555555',
  statusTodo: '66666666-6666-4666-8666-666666666666',
  statusDone: '77777777-7777-4777-8777-777777777777',
  section: '88888888-8888-4888-8888-888888888888',
  task: '99999999-9999-4999-8999-999999999999',
  recurrence: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  comment: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  nextTask: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
};

describe('task actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerEnv).mockReturnValue({
      SUPABASE_STORAGE_BUCKET_ATTACHMENTS: 'task-attachments'
    } as never);
  });

  it('creates task with defaults and sends assignment notification', async () => {
    const { supabase, history } = createSupabaseMock([
      { table: 'project_statuses', response: { data: { id: ids.statusTodo }, error: null } },
      { table: 'project_sections', response: { data: { id: ids.section }, error: null } },
      { table: 'tasks', response: { data: [{ sort_order: 4 }], error: null } },
      {
        table: 'tasks',
        response: {
          data: { id: ids.task, assignee_id: ids.userB, project_id: ids.project },
          error: null
        }
      },
      { table: 'task_activity', response: { data: null, error: null } },
      {
        table: 'projects',
        response: { data: { workspace_id: ids.workspace }, error: null }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });

    const result = await createTaskAction({
      projectId: ids.project,
      title: 'Ship release'
    });

    expect(result).toEqual({ ok: true, data: { taskId: ids.task } });
    expect(history[3]?.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        status_id: ids.statusTodo,
        section_id: ids.section,
        sort_order: 5
      })
    );
    expect(createNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        type: 'assignment',
        userId: ids.userB,
        entityId: ids.task
      })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/my-tasks');
  });

  it('returns error when project has no default status', async () => {
    const { supabase } = createSupabaseMock([
      { table: 'project_statuses', response: { data: null, error: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });

    const result = await createTaskAction({
      projectId: ids.project,
      title: 'Ship release'
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Project has no statuses configured.');
    }
  });

  it('updates task and notifies new assignee', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: {
            id: ids.task,
            project_id: ids.project,
            assignee_id: ids.userA,
            title: 'Original title'
          },
          error: null
        }
      },
      { table: 'tasks', response: { data: null, error: null } },
      { table: 'task_activity', response: { data: null, error: null } },
      {
        table: 'projects',
        response: { data: { workspace_id: ids.workspace }, error: null }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });

    const result = await updateTaskAction({
      id: ids.task,
      assigneeId: ids.userB,
      title: 'Updated title'
    });

    expect(result).toEqual({ ok: true, data: { taskId: ids.task } });
    expect(createNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({ userId: ids.userB, type: 'assignment' })
    );
  });

  it('moves task and logs activity', async () => {
    const { supabase, history } = createSupabaseMock([
      { table: 'tasks', response: { data: { project_id: ids.project }, error: null } },
      { table: 'tasks', response: { data: null, error: null } },
      { table: 'task_activity', response: { data: null, error: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });

    const result = await moveTaskAction({
      id: ids.task,
      statusId: ids.statusDone,
      sortOrder: 3
    });

    expect(result).toEqual({ ok: true, data: { taskId: ids.task } });
    expect(history[1]?.chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status_id: ids.statusDone, sort_order: 3 })
    );
  });

  it('completes recurring task and generates the next instance', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: {
            id: ids.task,
            project_id: ids.project,
            due_at: '2026-02-15T10:00:00.000Z',
            recurrence_id: ids.recurrence,
            title: 'Recurring'
          },
          error: null
        }
      },
      {
        table: 'project_statuses',
        response: { data: { id: ids.statusDone }, error: null }
      },
      { table: 'tasks', response: { data: null, error: null } },
      { table: 'task_activity', response: { data: null, error: null } },
      {
        table: 'tasks',
        response: {
          data: {
            id: ids.task,
            project_id: ids.project,
            section_id: ids.section,
            status_id: ids.statusDone,
            title: 'Recurring',
            description: null,
            assignee_id: ids.userA,
            creator_id: ids.userA,
            due_at: '2026-02-15T10:00:00.000Z',
            due_timezone: 'UTC',
            priority: null,
            is_today: false,
            recurrence_id: ids.recurrence
          },
          error: null
        }
      },
      {
        table: 'recurrences',
        response: {
          data: {
            id: ids.recurrence,
            pattern_json: { frequency: 'weekly', interval: 1 },
            is_paused: false
          },
          error: null
        }
      },
      {
        table: 'project_statuses',
        response: { data: { id: ids.statusTodo }, error: null }
      },
      { table: 'tasks', response: { data: [{ sort_order: 10 }], error: null } },
      {
        table: 'tasks',
        response: { data: { id: ids.nextTask }, error: null }
      },
      { table: 'task_activity', response: { data: null, error: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });

    const result = await completeTaskAction({ id: ids.task });

    expect(result).toEqual({ ok: true, data: { taskId: ids.task } });

    const taskActivityCalls = history
      .filter((entry) => entry.table === 'task_activity')
      .map((entry) => entry.chain.insert.mock.calls[0]?.[0]);

    expect(taskActivityCalls).toHaveLength(2);
    expect(taskActivityCalls[1]).toEqual(
      expect.objectContaining({
        task_id: ids.nextTask,
        event_type: 'recurrence_generated'
      })
    );
  });

  it('adds comment and emits mention notification', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: { id: ids.task, project_id: ids.project, assignee_id: ids.userB },
          error: null
        }
      },
      {
        table: 'task_comments',
        response: { data: { id: ids.comment }, error: null }
      },
      { table: 'task_activity', response: { data: null, error: null } },
      {
        table: 'projects',
        response: { data: { workspace_id: ids.workspace }, error: null }
      },
      {
        table: 'workspace_members',
        response: {
          data: [{ user_id: ids.userA }, { user_id: ids.userB }],
          error: null
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });

    const result = await addCommentAction({ taskId: ids.task, body: '@alex please review' });

    expect(result).toEqual({ ok: true, data: { commentId: ids.comment } });
    expect(createNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        type: 'mention',
        userId: ids.userB,
        entityType: 'comment'
      })
    );
  });

  it('fans out mention notifications to all mentioned users in workspace', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: { id: ids.task, project_id: ids.project, assignee_id: ids.userB },
          error: null
        }
      },
      {
        table: 'task_comments',
        response: { data: { id: ids.comment }, error: null }
      },
      { table: 'task_activity', response: { data: null, error: null } },
      {
        table: 'projects',
        response: { data: { workspace_id: ids.workspace }, error: null }
      },
      {
        table: 'workspace_members',
        response: {
          data: [{ user_id: ids.userA }, { user_id: ids.userB }, { user_id: ids.userC }],
          error: null
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });

    const result = await addCommentAction({
      taskId: ids.task,
      body: `Please review @[${ids.userB}] and @${ids.userC.slice(0, 12)}`
    });

    expect(result).toEqual({ ok: true, data: { commentId: ids.comment } });
    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(createNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        type: 'mention',
        userId: ids.userB,
        entityType: 'comment'
      })
    );
    expect(createNotification).toHaveBeenCalledWith(
      supabase,
      expect.objectContaining({
        type: 'mention',
        userId: ids.userC,
        entityType: 'comment'
      })
    );
  });

  it('uploads attachment and stores metadata', async () => {
    const { supabase, storageFrom, storageChain, history } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: {
            id: ids.task,
            project_id: ids.project,
            projects: { workspace_id: ids.workspace }
          },
          error: null
        }
      },
      {
        table: 'task_attachments',
        response: { data: { id: 'att-1' }, error: null }
      },
      { table: 'task_activity', response: { data: null, error: null } },
      {
        table: 'projects',
        response: { data: { workspace_id: ids.workspace }, error: null }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });

    const file = new File(['hello'], 'spec.txt', { type: 'text/plain' });
    const result = await uploadTaskAttachmentAction({ taskId: ids.task, file });

    expect(result).toEqual({ ok: true, data: { attachmentId: 'att-1' } });
    expect(storageFrom).toHaveBeenCalledWith('task-attachments');
    expect(storageChain.upload).toHaveBeenCalled();
    expect(history[1]?.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ task_id: ids.task, file_name: 'spec.txt' })
    );
  });

  it('rejects empty file uploads', async () => {
    const { supabase } = createSupabaseMock([]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.userA } as never,
      supabase: supabase as never
    });

    const result = await uploadTaskAttachmentAction({
      taskId: ids.task,
      file: new File([''], 'empty.txt')
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Please choose a non-empty file.');
    }
  });
});
