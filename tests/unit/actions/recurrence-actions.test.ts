import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRecurrenceAction,
  listRecurrencesQuery,
  pauseRecurrenceAction,
  resumeRecurrenceAction,
  updateRecurrenceAction
} from '@/lib/actions/recurrence-actions';
import { requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const ids = {
  user: '11111111-1111-4111-8111-111111111111',
  userB: '22222222-2222-4222-8222-222222222222',
  task: '33333333-3333-4333-8333-333333333333',
  project: '44444444-4444-4444-8444-444444444444',
  workspace: '55555555-5555-4555-8555-555555555555',
  recurrence: '66666666-6666-4666-8666-666666666666'
};

describe('recurrence actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates recurrence, links task, and returns summary', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: {
            id: ids.task,
            project_id: ids.project,
            due_at: '2026-03-04T10:00:00.000Z',
            recurrence_id: null,
            project: { workspace_id: ids.workspace }
          },
          error: null
        }
      },
      { table: 'recurrences', response: { data: null, error: null } },
      { table: 'tasks', response: { data: null, error: null } },
      {
        table: 'recurrences',
        response: {
          data: {
            id: ids.recurrence,
            workspace_id: ids.workspace,
            pattern_json: { frequency: 'weekly', interval: 1 },
            mode: 'create_on_complete',
            next_run_at: null,
            is_paused: false
          },
          error: null
        }
      },
      {
        table: 'tasks',
        response: { data: [{ id: ids.task, recurrence_id: ids.recurrence }], error: null }
      },
      {
        table: 'tasks',
        response: { data: [{ project_id: ids.project }], error: null }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.user } as never,
      supabase: supabase as never
    });

    const result = await createRecurrenceAction({
      workspaceId: ids.workspace,
      taskId: ids.task,
      pattern: { frequency: 'weekly', interval: 1 },
      mode: 'create_on_complete',
      actorUserId: ids.user
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected recurrence creation to succeed.');
    }

    expect(result.data.recurrence.mode).toBe('create_on_complete');
    expect(result.data.recurrence.linkedTaskIds).toEqual([ids.task]);
    expect(revalidatePath).toHaveBeenCalledWith('/my-tasks');
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${ids.project}`);
  });

  it('blocks recurrence creation when task already has recurrence', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: {
            id: ids.task,
            project_id: ids.project,
            due_at: '2026-03-04T10:00:00.000Z',
            recurrence_id: ids.recurrence,
            project: { workspace_id: ids.workspace }
          },
          error: null
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.user } as never,
      supabase: supabase as never
    });

    const result = await createRecurrenceAction({
      workspaceId: ids.workspace,
      taskId: ids.task,
      pattern: { frequency: 'weekly', interval: 1 },
      mode: 'create_on_complete',
      actorUserId: ids.user
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Task already has a recurrence. Update the existing recurrence instead.');
    }
  });

  it('derives next_run_at when updating to create_on_schedule with null next run', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'recurrences',
        response: {
          data: {
            id: ids.recurrence,
            pattern_json: { frequency: 'weekly', interval: 1 },
            mode: 'create_on_complete',
            next_run_at: null,
            is_paused: false
          },
          error: null
        }
      },
      {
        table: 'tasks',
        response: {
          data: [{ due_at: '2026-03-10T09:00:00.000Z' }],
          error: null
        }
      },
      { table: 'recurrences', response: { data: null, error: null } },
      {
        table: 'recurrences',
        response: {
          data: {
            id: ids.recurrence,
            workspace_id: ids.workspace,
            pattern_json: { frequency: 'monthly', interval: 1 },
            mode: 'create_on_schedule',
            next_run_at: '2026-04-10T09:00:00.000Z',
            is_paused: false
          },
          error: null
        }
      },
      {
        table: 'tasks',
        response: { data: [{ id: ids.task, recurrence_id: ids.recurrence }], error: null }
      },
      {
        table: 'tasks',
        response: { data: [{ project_id: ids.project }], error: null }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.user } as never,
      supabase: supabase as never
    });

    const result = await updateRecurrenceAction({
      recurrenceId: ids.recurrence,
      pattern: { frequency: 'monthly', interval: 1 },
      mode: 'create_on_schedule',
      actorUserId: ids.user
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected recurrence update to succeed.');
    }

    expect(result.data.recurrence.mode).toBe('create_on_schedule');
    expect(result.data.recurrence.nextRunAt).toBe('2026-04-10T09:00:00.000Z');
  });

  it('returns strict error when pausing an already paused recurrence', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'recurrences',
        response: {
          data: { id: ids.recurrence, is_paused: true },
          error: null
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.user } as never,
      supabase: supabase as never
    });

    const result = await pauseRecurrenceAction({
      recurrenceId: ids.recurrence,
      actorUserId: ids.user
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Recurrence is already paused.');
    }
  });

  it('resumes schedule-mode recurrence and derives missing next run', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'recurrences',
        response: {
          data: {
            id: ids.recurrence,
            pattern_json: { frequency: 'weekly', interval: 2 },
            mode: 'create_on_schedule',
            next_run_at: null,
            is_paused: true
          },
          error: null
        }
      },
      {
        table: 'tasks',
        response: {
          data: [{ due_at: '2026-03-04T10:00:00.000Z' }],
          error: null
        }
      },
      { table: 'recurrences', response: { data: null, error: null } },
      {
        table: 'tasks',
        response: { data: [{ project_id: ids.project }], error: null }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.user } as never,
      supabase: supabase as never
    });

    const result = await resumeRecurrenceAction({
      recurrenceId: ids.recurrence,
      actorUserId: ids.user
    });

    expect(result).toEqual({
      ok: true,
      data: expect.objectContaining({
        recurrenceId: ids.recurrence,
        isPaused: false
      })
    });
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${ids.project}`);
  });

  it('lists recurrences for a workspace', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'recurrences',
        response: {
          data: [
            {
              id: ids.recurrence,
              workspace_id: ids.workspace,
              pattern_json: { frequency: 'daily', interval: 1 },
              mode: 'create_on_complete',
              next_run_at: null,
              is_paused: false
            }
          ],
          error: null
        }
      },
      {
        table: 'tasks',
        response: { data: [{ id: ids.task, recurrence_id: ids.recurrence }], error: null }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.user } as never,
      supabase: supabase as never
    });

    const result = await listRecurrencesQuery({
      workspaceId: ids.workspace
    });

    expect(result.recurrences).toHaveLength(1);
    expect(result.recurrences[0]).toEqual(
      expect.objectContaining({
        id: ids.recurrence,
        linkedTaskIds: [ids.task]
      })
    );
  });

  it('rejects actor mismatch', async () => {
    const { supabase } = createSupabaseMock([]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: ids.user } as never,
      supabase: supabase as never
    });

    const result = await pauseRecurrenceAction({
      recurrenceId: ids.recurrence,
      actorUserId: ids.userB
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Actor user does not match the authenticated user.');
    }
  });
});
