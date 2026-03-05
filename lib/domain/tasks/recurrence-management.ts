import { parseRecurrencePattern } from '@/lib/domain/tasks/recurrence';
import type {
  ListRecurrencesInput,
  ListRecurrencesOutput,
  RecurrenceSummary
} from '@/lib/contracts/recurrence-management-ui';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';

type RecurrenceRow = {
  id: string;
  workspace_id: string;
  pattern_json: unknown;
  mode: 'create_on_complete' | 'create_on_schedule';
  next_run_at: string | null;
  is_paused: boolean;
};

export async function listRecurrencesForWorkspace(
  supabase: AppSupabaseClient,
  input: ListRecurrencesInput
): Promise<ListRecurrencesOutput> {
  let query = supabase
    .from('recurrences')
    .select('id, workspace_id, pattern_json, mode, next_run_at, is_paused')
    .eq('workspace_id', input.workspaceId)
    .order('created_at', { ascending: false });

  if (!input.includePaused) {
    query = query.eq('is_paused', false);
  }

  const { data: recurrences, error } = await query;
  if (error) {
    throw error;
  }

  return {
    recurrences: await buildRecurrenceSummaries(supabase, recurrences ?? [])
  };
}

export async function getRecurrenceSummaryById(
  supabase: AppSupabaseClient,
  recurrenceId: string
): Promise<RecurrenceSummary | null> {
  const { data, error } = await supabase
    .from('recurrences')
    .select('id, workspace_id, pattern_json, mode, next_run_at, is_paused')
    .eq('id', recurrenceId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const summaries = await buildRecurrenceSummaries(supabase, [data]);
  return summaries[0] ?? null;
}

async function buildRecurrenceSummaries(
  supabase: AppSupabaseClient,
  recurrences: RecurrenceRow[]
) {
  if (!recurrences.length) {
    return [];
  }

  const recurrenceIds = recurrences.map((recurrence) => recurrence.id);
  const { data: linkedTasks, error: linkedTaskError } = await supabase
    .from('tasks')
    .select('id, recurrence_id')
    .in('recurrence_id', recurrenceIds);

  if (linkedTaskError) {
    throw linkedTaskError;
  }

  const linkedTaskIdsByRecurrence = new Map<string, string[]>();
  (linkedTasks ?? []).forEach((task) => {
    if (!task.recurrence_id) {
      return;
    }

    const bucket = linkedTaskIdsByRecurrence.get(task.recurrence_id) ?? [];
    bucket.push(task.id);
    linkedTaskIdsByRecurrence.set(task.recurrence_id, bucket);
  });

  return recurrences
    .map((recurrence) => toRecurrenceSummary(recurrence, linkedTaskIdsByRecurrence.get(recurrence.id) ?? []))
    .filter((summary): summary is RecurrenceSummary => summary !== null);
}

function toRecurrenceSummary(
  recurrence: RecurrenceRow,
  linkedTaskIds: string[]
): RecurrenceSummary | null {
  const pattern = parseRecurrencePattern(recurrence.pattern_json);
  if (!pattern) {
    return null;
  }

  return {
    id: recurrence.id,
    workspaceId: recurrence.workspace_id,
    pattern,
    mode: recurrence.mode,
    nextRunAt: recurrence.next_run_at,
    isPaused: recurrence.is_paused,
    linkedTaskIds
  };
}
