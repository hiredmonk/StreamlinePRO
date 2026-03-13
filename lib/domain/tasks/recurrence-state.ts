import { parseRecurrencePattern, getNextDueDate } from '@/lib/domain/tasks/recurrence';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';
import type { TaskRecurrenceEditorState } from '@/lib/domain/tasks/recurrence-types';

type TaskForRecurrenceResolver = {
  parent_task_id: string | null;
  completed_at: string | null;
  due_at: string | null;
  recurrence_id: string | null;
};

export async function resolveRecurrenceEditorState(
  supabase: AppSupabaseClient,
  task: TaskForRecurrenceResolver
): Promise<TaskRecurrenceEditorState> {
  if (task.parent_task_id) {
    return { canManage: false, disabledReason: 'Subtasks cannot have recurrence.', summary: null };
  }

  if (task.completed_at) {
    return { canManage: false, disabledReason: 'Completed tasks cannot have recurrence.', summary: null };
  }

  if (!task.due_at) {
    return { canManage: false, disabledReason: 'Set a due date first.', summary: null };
  }

  if (!task.recurrence_id) {
    return { canManage: true, disabledReason: null, summary: null };
  }

  const { data: recurrence, error } = await supabase
    .from('recurrences')
    .select('id, pattern_json, is_paused')
    .eq('id', task.recurrence_id)
    .maybeSingle();

  if (error || !recurrence) {
    return { canManage: true, disabledReason: null, summary: null };
  }

  const pattern = parseRecurrencePattern(recurrence.pattern_json);

  if (!pattern) {
    return { canManage: true, disabledReason: null, summary: null };
  }

  const nextDueAtPreview = recurrence.is_paused
    ? null
    : getNextDueDate(new Date(task.due_at), pattern).toISOString();

  return {
    canManage: true,
    disabledReason: null,
    summary: {
      recurrenceId: recurrence.id,
      pattern: { frequency: pattern.frequency, interval: pattern.interval },
      mode: 'create_on_complete',
      isPaused: recurrence.is_paused,
      nextDueAtPreview
    }
  };
}
