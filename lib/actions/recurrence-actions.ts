'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { getRecurrenceSummaryById, listRecurrencesForWorkspace } from '@/lib/domain/tasks/recurrence-management';
import { getNextDueDate, parseRecurrencePattern } from '@/lib/domain/tasks/recurrence';
import { toErrorMessage } from '@/lib/utils';
import type {
  CreateRecurrenceAction,
  PauseRecurrenceAction,
  ResumeRecurrenceAction,
  ListRecurrencesQuery,
  RecurrencePatternInput,
  UpdateRecurrenceAction
} from '@/lib/contracts/recurrence-management-ui';
import type { Json } from '@/lib/supabase/types';
import {
  createRecurrenceSchema,
  listRecurrencesSchema,
  pauseRecurrenceSchema,
  resumeRecurrenceSchema,
  updateRecurrenceSchema
} from '@/lib/validators/recurrence';

export const createRecurrenceAction: CreateRecurrenceAction = async (input) => {
  try {
    const parsed = createRecurrenceSchema.parse(input);
    const { user, supabase } = await requireUser();
    assertActorMatchesUser(parsed.actorUserId, user.id);

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(
        `
        id,
        project_id,
        due_at,
        recurrence_id,
        project:projects!tasks_project_id_fkey (
          workspace_id
        )
      `
      )
      .eq('id', parsed.taskId)
      .maybeSingle();

    if (taskError || !task) {
      throw taskError ?? new Error('Task not found.');
    }

    if (task.recurrence_id) {
      throw new Error('Task already has a recurrence. Update the existing recurrence instead.');
    }

    const project = Array.isArray(task.project) ? task.project[0] : task.project;
    if (!project || project.workspace_id !== parsed.workspaceId) {
      throw new Error('Task does not belong to the provided workspace.');
    }

    const anchorDueAt = parsed.anchorDueAt ?? task.due_at;
    if (!anchorDueAt) {
      throw new Error('Recurrence requires an anchor due date.');
    }

    const recurrenceId = randomUUID();
    const nextRunAt =
      parsed.mode === 'create_on_schedule' ? computeNextRunAt(anchorDueAt, parsed.pattern) : null;

    const { error: recurrenceError } = await supabase.from('recurrences').insert({
      id: recurrenceId,
      workspace_id: parsed.workspaceId,
      pattern_json: parsed.pattern as Json,
      mode: parsed.mode,
      next_run_at: nextRunAt,
      is_paused: false,
      created_by: user.id
    });

    if (recurrenceError) {
      throw recurrenceError;
    }

    const { error: taskUpdateError } = await supabase
      .from('tasks')
      .update({
        recurrence_id: recurrenceId,
        updated_at: new Date().toISOString()
      })
      .eq('id', parsed.taskId);

    if (taskUpdateError) {
      await supabase.from('recurrences').delete().eq('id', recurrenceId);
      throw taskUpdateError;
    }

    const recurrence = await getRecurrenceSummaryById(supabase, recurrenceId);
    if (!recurrence) {
      throw new Error('Recurrence was created but could not be loaded.');
    }

    await revalidateRecurrencePaths(supabase, recurrenceId, task.project_id);

    return {
      ok: true,
      data: { recurrence }
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
};

export const updateRecurrenceAction: UpdateRecurrenceAction = async (input) => {
  try {
    const parsed = updateRecurrenceSchema.parse(input);
    const { user, supabase } = await requireUser();
    assertActorMatchesUser(parsed.actorUserId, user.id);

    const { data: recurrence, error: recurrenceError } = await supabase
      .from('recurrences')
      .select('id, pattern_json, mode, next_run_at, is_paused')
      .eq('id', parsed.recurrenceId)
      .maybeSingle();

    if (recurrenceError || !recurrence) {
      throw recurrenceError ?? new Error('Recurrence not found.');
    }

    const existingPattern = parseRecurrencePattern(recurrence.pattern_json);
    if (!existingPattern) {
      throw new Error('Existing recurrence pattern is invalid.');
    }

    const nextPattern = parsed.pattern ?? existingPattern;
    const nextMode = parsed.mode ?? recurrence.mode;
    let nextRunAt = recurrence.next_run_at;

    if (nextMode === 'create_on_schedule' && !nextRunAt) {
      const anchorDueAt = await getRecurrenceAnchorDueAt(supabase, recurrence.id);
      if (!anchorDueAt) {
        throw new Error('create_on_schedule recurrence requires an anchor due date from linked tasks.');
      }

      nextRunAt = computeNextRunAt(anchorDueAt, nextPattern);
    }

    const updatePayload: {
      pattern_json?: Json;
      mode?: 'create_on_complete' | 'create_on_schedule';
      next_run_at?: string | null;
    } = {};

    if (parsed.pattern) {
      updatePayload.pattern_json = parsed.pattern as Json;
    }

    if (parsed.mode) {
      updatePayload.mode = parsed.mode;
    }

    if (nextRunAt !== recurrence.next_run_at) {
      updatePayload.next_run_at = nextRunAt;
    }

    const { error: updateError } = await supabase
      .from('recurrences')
      .update(updatePayload)
      .eq('id', parsed.recurrenceId);

    if (updateError) {
      throw updateError;
    }

    const summary = await getRecurrenceSummaryById(supabase, parsed.recurrenceId);
    if (!summary) {
      throw new Error('Updated recurrence could not be loaded.');
    }

    await revalidateRecurrencePaths(supabase, parsed.recurrenceId);

    return {
      ok: true,
      data: { recurrence: summary }
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
};

export const pauseRecurrenceAction: PauseRecurrenceAction = async (input) => {
  try {
    const parsed = pauseRecurrenceSchema.parse(input);
    const { user, supabase } = await requireUser();
    assertActorMatchesUser(parsed.actorUserId, user.id);

    const { data: recurrence, error: recurrenceError } = await supabase
      .from('recurrences')
      .select('id, is_paused')
      .eq('id', parsed.recurrenceId)
      .maybeSingle();

    if (recurrenceError || !recurrence) {
      throw recurrenceError ?? new Error('Recurrence not found.');
    }

    if (recurrence.is_paused) {
      throw new Error('Recurrence is already paused.');
    }

    const pausedAt = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('recurrences')
      .update({ is_paused: true })
      .eq('id', parsed.recurrenceId);

    if (updateError) {
      throw updateError;
    }

    await revalidateRecurrencePaths(supabase, parsed.recurrenceId);

    return {
      ok: true,
      data: {
        recurrenceId: parsed.recurrenceId,
        isPaused: true,
        pausedAt
      }
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
};

export const resumeRecurrenceAction: ResumeRecurrenceAction = async (input) => {
  try {
    const parsed = resumeRecurrenceSchema.parse(input);
    const { user, supabase } = await requireUser();
    assertActorMatchesUser(parsed.actorUserId, user.id);

    const { data: recurrence, error: recurrenceError } = await supabase
      .from('recurrences')
      .select('id, pattern_json, mode, next_run_at, is_paused')
      .eq('id', parsed.recurrenceId)
      .maybeSingle();

    if (recurrenceError || !recurrence) {
      throw recurrenceError ?? new Error('Recurrence not found.');
    }

    if (!recurrence.is_paused) {
      throw new Error('Recurrence is already active.');
    }

    const pattern = parseRecurrencePattern(recurrence.pattern_json);
    if (!pattern) {
      throw new Error('Existing recurrence pattern is invalid.');
    }

    let nextRunAt = recurrence.next_run_at;
    if (recurrence.mode === 'create_on_schedule' && !nextRunAt) {
      const anchorDueAt = await getRecurrenceAnchorDueAt(supabase, recurrence.id);
      if (!anchorDueAt) {
        throw new Error('create_on_schedule recurrence requires an anchor due date from linked tasks.');
      }

      nextRunAt = computeNextRunAt(anchorDueAt, pattern);
    }

    const { error: updateError } = await supabase
      .from('recurrences')
      .update({
        is_paused: false,
        next_run_at: nextRunAt
      })
      .eq('id', parsed.recurrenceId);

    if (updateError) {
      throw updateError;
    }

    const resumedAt = new Date().toISOString();
    await revalidateRecurrencePaths(supabase, parsed.recurrenceId);

    return {
      ok: true,
      data: {
        recurrenceId: parsed.recurrenceId,
        isPaused: false,
        resumedAt
      }
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
};

export const listRecurrencesQuery: ListRecurrencesQuery = async (input) => {
  const parsed = listRecurrencesSchema.parse(input);
  const { supabase } = await requireUser();

  return listRecurrencesForWorkspace(supabase, parsed);
};

function assertActorMatchesUser(actorUserId: string, userId: string) {
  if (actorUserId !== userId) {
    throw new Error('Actor user does not match the authenticated user.');
  }
}

function computeNextRunAt(anchorDueAt: string, pattern: RecurrencePatternInput) {
  const anchorDate = new Date(anchorDueAt);
  if (Number.isNaN(anchorDate.getTime())) {
    throw new Error('Anchor due date is invalid.');
  }

  return getNextDueDate(anchorDate, pattern).toISOString();
}

async function getRecurrenceAnchorDueAt(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  recurrenceId: string
) {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('due_at')
    .eq('recurrence_id', recurrenceId)
    .order('due_at', { ascending: true, nullsFirst: false });

  if (error) {
    throw error;
  }

  return (tasks ?? []).find((task) => Boolean(task.due_at))?.due_at ?? null;
}

async function revalidateRecurrencePaths(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  recurrenceId: string,
  projectIdHint?: string
) {
  revalidatePath('/my-tasks');
  revalidatePath('/projects');

  const projectIds = new Set<string>();
  if (projectIdHint) {
    projectIds.add(projectIdHint);
  }

  const { data: linkedTasks, error } = await supabase
    .from('tasks')
    .select('project_id')
    .eq('recurrence_id', recurrenceId);

  if (error) {
    throw error;
  }

  (linkedTasks ?? []).forEach((task) => {
    projectIds.add(task.project_id);
  });

  for (const projectId of projectIds) {
    revalidatePath(`/projects/${projectId}`);
  }
}
