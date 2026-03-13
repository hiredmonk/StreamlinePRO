import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createTaskRecurrenceAction,
  updateTaskRecurrenceAction,
  pauseTaskRecurrenceAction,
  resumeTaskRecurrenceAction,
  clearTaskRecurrenceAction
} from '@/lib/actions/recurrence-actions';
import { requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const ids = {
  userA: '11111111-1111-4111-8111-111111111111',
  project: '55555555-5555-4555-8555-555555555555',
  workspace: '44444444-4444-4444-8444-444444444444',
  task: '99999999-9999-4999-8999-999999999999',
  recurrence: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
};

describe('recurrence actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTaskRecurrenceAction', () => {
    it('creates recurrence for eligible task', async () => {
      const { supabase, rpc, history } = createSupabaseMock(
        [
        {
          table: 'tasks',
          response: {
            data: {
              id: ids.task,
              project_id: ids.project,
              recurrence_id: null,
              parent_task_id: null,
              completed_at: null,
              due_at: '2026-03-15T10:00:00.000Z'
            },
            error: null
          }
        },
        {
          table: 'projects',
          response: { data: { workspace_id: ids.workspace }, error: null }
        },
        { table: 'task_activity', response: { data: null, error: null } }
        ],
        [{ fn: 'create_task_recurrence_for_task', response: { data: 'rpc-ok', error: null } }]
      );

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await createTaskRecurrenceAction({
        taskId: ids.task,
        frequency: 'weekly',
        interval: 2
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.data.recurrenceId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        );
        expect(rpc).toHaveBeenCalledWith('create_task_recurrence_for_task', {
          p_task_id: ids.task,
          p_workspace_id: ids.workspace,
          p_recurrence_id: expect.any(String),
          p_frequency: 'weekly',
          p_interval: 2,
          p_created_by: ids.userA
        });
      }
      expect(history[2]?.chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: ids.task,
          actor_id: ids.userA,
          event_type: 'recurrence_created'
        })
      );
      expect(revalidatePath).toHaveBeenCalledWith('/my-tasks');
    });

    it('rejects subtasks', async () => {
      const { supabase } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: {
              id: ids.task,
              project_id: ids.project,
              recurrence_id: null,
              parent_task_id: '00000000-0000-4000-8000-000000000001',
              completed_at: null,
              due_at: '2026-03-15T10:00:00.000Z'
            },
            error: null
          }
        }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await createTaskRecurrenceAction({
        taskId: ids.task,
        frequency: 'weekly',
        interval: 1
      });

      expect(result).toEqual({ ok: false, error: 'Subtasks cannot have recurrence.' });
    });

    it('rejects completed tasks', async () => {
      const { supabase } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: {
              id: ids.task,
              project_id: ids.project,
              recurrence_id: null,
              parent_task_id: null,
              completed_at: '2026-03-10T10:00:00.000Z',
              due_at: '2026-03-15T10:00:00.000Z'
            },
            error: null
          }
        }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await createTaskRecurrenceAction({
        taskId: ids.task,
        frequency: 'daily',
        interval: 1
      });

      expect(result).toEqual({ ok: false, error: 'Completed tasks cannot have recurrence.' });
    });

    it('rejects tasks without due date', async () => {
      const { supabase } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: {
              id: ids.task,
              project_id: ids.project,
              recurrence_id: null,
              parent_task_id: null,
              completed_at: null,
              due_at: null
            },
            error: null
          }
        }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await createTaskRecurrenceAction({
        taskId: ids.task,
        frequency: 'monthly',
        interval: 1
      });

      expect(result).toEqual({ ok: false, error: 'Set a due date before adding recurrence.' });
    });

    it('rejects task that already has recurrence', async () => {
      const { supabase } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: {
              id: ids.task,
              project_id: ids.project,
              recurrence_id: ids.recurrence,
              parent_task_id: null,
              completed_at: null,
              due_at: '2026-03-15T10:00:00.000Z'
            },
            error: null
          }
        }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await createTaskRecurrenceAction({
        taskId: ids.task,
        frequency: 'weekly',
        interval: 1
      });

      expect(result).toEqual({
        ok: false,
        error: 'This task already has a recurrence. Update or remove it first.'
      });
    });
  });

  describe('updateTaskRecurrenceAction', () => {
    it('updates recurrence pattern', async () => {
      const { supabase, history } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: { id: ids.task, project_id: ids.project, recurrence_id: ids.recurrence },
            error: null
          }
        },
        { table: 'recurrences', response: { data: { id: ids.recurrence }, error: null } },
        { table: 'task_activity', response: { data: null, error: null } }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await updateTaskRecurrenceAction({
        taskId: ids.task,
        recurrenceId: ids.recurrence,
        frequency: 'monthly',
        interval: 3
      });

      expect(result).toEqual({ ok: true, data: { recurrenceId: ids.recurrence } });
      expect(history[1]?.chain.update).toHaveBeenCalledWith(
        expect.objectContaining({
          pattern_json: { frequency: 'monthly', interval: 3 }
        })
      );
    });

    it('rejects update when recurrence row is missing', async () => {
      const { supabase } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: { id: ids.task, project_id: ids.project, recurrence_id: ids.recurrence },
            error: null
          }
        },
        { table: 'recurrences', response: { data: null, error: null } }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await updateTaskRecurrenceAction({
        taskId: ids.task,
        recurrenceId: ids.recurrence,
        frequency: 'weekly',
        interval: 1
      });

      expect(result).toEqual({ ok: false, error: 'Recurrence not found.' });
    });

    it('rejects ownership mismatch', async () => {
      const otherRecurrence = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const { supabase } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: { id: ids.task, project_id: ids.project, recurrence_id: otherRecurrence },
            error: null
          }
        }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await updateTaskRecurrenceAction({
        taskId: ids.task,
        recurrenceId: ids.recurrence,
        frequency: 'daily',
        interval: 1
      });

      expect(result).toEqual({ ok: false, error: 'Recurrence does not belong to this task.' });
    });
  });

  describe('pauseTaskRecurrenceAction', () => {
    it('pauses recurrence', async () => {
      const { supabase, history } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: { id: ids.task, project_id: ids.project, recurrence_id: ids.recurrence },
            error: null
          }
        },
        { table: 'recurrences', response: { data: { id: ids.recurrence }, error: null } },
        { table: 'task_activity', response: { data: null, error: null } }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await pauseTaskRecurrenceAction({
        taskId: ids.task,
        recurrenceId: ids.recurrence
      });

      expect(result).toEqual({ ok: true, data: { recurrenceId: ids.recurrence } });
      expect(history[1]?.chain.update).toHaveBeenCalledWith({ is_paused: true });
    });

    it('rejects pause when recurrence row is missing', async () => {
      const { supabase } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: { id: ids.task, project_id: ids.project, recurrence_id: ids.recurrence },
            error: null
          }
        },
        { table: 'recurrences', response: { data: null, error: null } }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await pauseTaskRecurrenceAction({
        taskId: ids.task,
        recurrenceId: ids.recurrence
      });

      expect(result).toEqual({ ok: false, error: 'Recurrence not found.' });
    });
  });

  describe('resumeTaskRecurrenceAction', () => {
    it('resumes recurrence', async () => {
      const { supabase, history } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: { id: ids.task, project_id: ids.project, recurrence_id: ids.recurrence },
            error: null
          }
        },
        { table: 'recurrences', response: { data: { id: ids.recurrence }, error: null } },
        { table: 'task_activity', response: { data: null, error: null } }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await resumeTaskRecurrenceAction({
        taskId: ids.task,
        recurrenceId: ids.recurrence
      });

      expect(result).toEqual({ ok: true, data: { recurrenceId: ids.recurrence } });
      expect(history[1]?.chain.update).toHaveBeenCalledWith({ is_paused: false });
    });

    it('rejects resume when recurrence row is missing', async () => {
      const { supabase } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: { id: ids.task, project_id: ids.project, recurrence_id: ids.recurrence },
            error: null
          }
        },
        { table: 'recurrences', response: { data: null, error: null } }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await resumeTaskRecurrenceAction({
        taskId: ids.task,
        recurrenceId: ids.recurrence
      });

      expect(result).toEqual({ ok: false, error: 'Recurrence not found.' });
    });
  });

  describe('clearTaskRecurrenceAction', () => {
    it('unlinks recurrence and pauses it', async () => {
      const { supabase, rpc, history } = createSupabaseMock(
        [
        {
          table: 'tasks',
          response: {
            data: { id: ids.task, project_id: ids.project, recurrence_id: ids.recurrence },
            error: null
          }
        },
        { table: 'task_activity', response: { data: null, error: null } }
        ],
        [{ fn: 'clear_task_recurrence_for_task', response: { data: ids.recurrence, error: null } }]
      );

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await clearTaskRecurrenceAction({
        taskId: ids.task,
        recurrenceId: ids.recurrence
      });

      expect(result).toEqual({ ok: true, data: { recurrenceId: ids.recurrence } });
      expect(rpc).toHaveBeenCalledWith('clear_task_recurrence_for_task', {
        p_task_id: ids.task,
        p_recurrence_id: ids.recurrence
      });
      expect(history[1]?.chain.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: ids.task,
          actor_id: ids.userA,
          event_type: 'recurrence_cleared'
        })
      );
    });

    it('rejects ownership mismatch', async () => {
      const otherRecurrence = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
      const { supabase } = createSupabaseMock([
        {
          table: 'tasks',
          response: {
            data: { id: ids.task, project_id: ids.project, recurrence_id: otherRecurrence },
            error: null
          }
        }
      ]);

      vi.mocked(requireUser).mockResolvedValue({
        user: { id: ids.userA } as never,
        supabase: supabase as never
      });

      const result = await clearTaskRecurrenceAction({
        taskId: ids.task,
        recurrenceId: ids.recurrence
      });

      expect(result).toEqual({ ok: false, error: 'Recurrence does not belong to this task.' });
    });
  });
});
