import { describe, expect, it, vi } from 'vitest';
import { resolveRecurrenceEditorState } from '@/lib/domain/tasks/recurrence-state';
import { createQueryChain } from '@/tests/helpers/supabase-mock';

function createMockSupabase(recurrenceResponse?: { data: any; error: any }) {
  const chain = createQueryChain(recurrenceResponse);
  return {
    from: vi.fn(() => chain)
  };
}

describe('resolveRecurrenceEditorState', () => {
  it('returns disabled for subtasks', async () => {
    const supabase = createMockSupabase();
    const result = await resolveRecurrenceEditorState(supabase as never, {
      parent_task_id: 'some-parent-id',
      completed_at: null,
      due_at: '2026-03-15T10:00:00.000Z',
      recurrence_id: null
    });

    expect(result).toEqual({
      canManage: false,
      disabledReason: 'Subtasks cannot have recurrence.',
      summary: null
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('returns disabled for completed tasks', async () => {
    const supabase = createMockSupabase();
    const result = await resolveRecurrenceEditorState(supabase as never, {
      parent_task_id: null,
      completed_at: '2026-03-10T10:00:00.000Z',
      due_at: '2026-03-15T10:00:00.000Z',
      recurrence_id: null
    });

    expect(result).toEqual({
      canManage: false,
      disabledReason: 'Completed tasks cannot have recurrence.',
      summary: null
    });
  });

  it('returns disabled when no due date', async () => {
    const supabase = createMockSupabase();
    const result = await resolveRecurrenceEditorState(supabase as never, {
      parent_task_id: null,
      completed_at: null,
      due_at: null,
      recurrence_id: null
    });

    expect(result).toEqual({
      canManage: false,
      disabledReason: 'Set a due date first.',
      summary: null
    });
  });

  it('returns empty state when no recurrence', async () => {
    const supabase = createMockSupabase();
    const result = await resolveRecurrenceEditorState(supabase as never, {
      parent_task_id: null,
      completed_at: null,
      due_at: '2026-03-15T10:00:00.000Z',
      recurrence_id: null
    });

    expect(result).toEqual({
      canManage: true,
      disabledReason: null,
      summary: null
    });
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('builds summary for active recurrence', async () => {
    const supabase = createMockSupabase({
      data: {
        id: 'rec-1',
        pattern_json: { frequency: 'weekly', interval: 2 },
        is_paused: false
      },
      error: null
    });

    const result = await resolveRecurrenceEditorState(supabase as never, {
      parent_task_id: null,
      completed_at: null,
      due_at: '2026-03-15T10:00:00.000Z',
      recurrence_id: 'rec-1'
    });

    expect(result.canManage).toBe(true);
    expect(result.summary).toEqual({
      recurrenceId: 'rec-1',
      pattern: { frequency: 'weekly', interval: 2 },
      mode: 'create_on_complete',
      isPaused: false,
      nextDueAtPreview: '2026-03-29T10:00:00.000Z'
    });
  });

  it('builds summary for paused recurrence without next due preview', async () => {
    const supabase = createMockSupabase({
      data: {
        id: 'rec-1',
        pattern_json: { frequency: 'daily', interval: 1 },
        is_paused: true
      },
      error: null
    });

    const result = await resolveRecurrenceEditorState(supabase as never, {
      parent_task_id: null,
      completed_at: null,
      due_at: '2026-03-15T10:00:00.000Z',
      recurrence_id: 'rec-1'
    });

    expect(result.summary?.isPaused).toBe(true);
    expect(result.summary?.nextDueAtPreview).toBeNull();
  });

  it('falls back to empty state for invalid pattern', async () => {
    const supabase = createMockSupabase({
      data: {
        id: 'rec-1',
        pattern_json: { frequency: 'yearly', interval: 1 },
        is_paused: false
      },
      error: null
    });

    const result = await resolveRecurrenceEditorState(supabase as never, {
      parent_task_id: null,
      completed_at: null,
      due_at: '2026-03-15T10:00:00.000Z',
      recurrence_id: 'rec-1'
    });

    expect(result).toEqual({
      canManage: true,
      disabledReason: null,
      summary: null
    });
  });

  it('falls back to empty state when recurrence row not found', async () => {
    const supabase = createMockSupabase({
      data: null,
      error: null
    });

    const result = await resolveRecurrenceEditorState(supabase as never, {
      parent_task_id: null,
      completed_at: null,
      due_at: '2026-03-15T10:00:00.000Z',
      recurrence_id: 'rec-missing'
    });

    expect(result).toEqual({
      canManage: true,
      disabledReason: null,
      summary: null
    });
  });
});
