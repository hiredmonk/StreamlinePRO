'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import {
  createTaskRecurrenceSchema,
  updateTaskRecurrenceSchema,
  pauseTaskRecurrenceSchema,
  resumeTaskRecurrenceSchema,
  clearTaskRecurrenceSchema
} from '@/lib/validators/recurrence';
import { toErrorMessage } from '@/lib/utils';
import type { ActionResult } from '@/lib/actions/types';
import type { Json } from '@/lib/supabase/types';

export async function createTaskRecurrenceAction(input: {
  taskId: string;
  frequency: string;
  interval: number;
}): Promise<ActionResult<{ recurrenceId: string }>> {
  try {
    const parsed = createTaskRecurrenceSchema.parse(input);
    const { user, supabase } = await requireUser();

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, recurrence_id, parent_task_id, completed_at, due_at')
      .eq('id', parsed.taskId)
      .maybeSingle();

    if (taskError || !task) {
      throw taskError ?? new Error('Task not found.');
    }

    if (task.parent_task_id) {
      throw new Error('Subtasks cannot have recurrence.');
    }

    if (task.completed_at) {
      throw new Error('Completed tasks cannot have recurrence.');
    }

    if (!task.due_at) {
      throw new Error('Set a due date before adding recurrence.');
    }

    if (task.recurrence_id) {
      throw new Error('This task already has a recurrence. Update or remove it first.');
    }

    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('workspace_id')
      .eq('id', task.project_id)
      .maybeSingle();

    if (projectError || !project) {
      throw projectError ?? new Error('Project not found.');
    }

    const recurrenceId = randomUUID();

    const { error: insertError } = await supabase.from('recurrences').insert({
      id: recurrenceId,
      workspace_id: project.workspace_id,
      pattern_json: { frequency: parsed.frequency, interval: parsed.interval } as unknown as Json,
      mode: 'create_on_complete',
      is_paused: false,
      created_by: user.id
    });

    if (insertError) {
      throw insertError;
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ recurrence_id: recurrenceId, updated_at: new Date().toISOString() })
      .eq('id', parsed.taskId);

    if (updateError) {
      throw updateError;
    }

    await logActivity(supabase, {
      taskId: parsed.taskId,
      actorId: user.id,
      eventType: 'recurrence_created',
      payload: { frequency: parsed.frequency, interval: parsed.interval }
    });

    revalidateTaskPaths(task.project_id);

    return { ok: true, data: { recurrenceId } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function updateTaskRecurrenceAction(input: {
  taskId: string;
  recurrenceId: string;
  frequency: string;
  interval: number;
}): Promise<ActionResult<{ recurrenceId: string }>> {
  try {
    const parsed = updateTaskRecurrenceSchema.parse(input);
    const { user, supabase } = await requireUser();

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, recurrence_id')
      .eq('id', parsed.taskId)
      .maybeSingle();

    if (taskError || !task) {
      throw taskError ?? new Error('Task not found.');
    }

    if (task.recurrence_id !== parsed.recurrenceId) {
      throw new Error('Recurrence does not belong to this task.');
    }

    const { error: updateError } = await supabase
      .from('recurrences')
      .update({
        pattern_json: { frequency: parsed.frequency, interval: parsed.interval } as unknown as Json
      })
      .eq('id', parsed.recurrenceId);

    if (updateError) {
      throw updateError;
    }

    await logActivity(supabase, {
      taskId: parsed.taskId,
      actorId: user.id,
      eventType: 'recurrence_updated',
      payload: { frequency: parsed.frequency, interval: parsed.interval }
    });

    revalidateTaskPaths(task.project_id);

    return { ok: true, data: { recurrenceId: parsed.recurrenceId } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function pauseTaskRecurrenceAction(input: {
  taskId: string;
  recurrenceId: string;
}): Promise<ActionResult<{ recurrenceId: string }>> {
  try {
    const parsed = pauseTaskRecurrenceSchema.parse(input);
    const { user, supabase } = await requireUser();

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, recurrence_id')
      .eq('id', parsed.taskId)
      .maybeSingle();

    if (taskError || !task) {
      throw taskError ?? new Error('Task not found.');
    }

    if (task.recurrence_id !== parsed.recurrenceId) {
      throw new Error('Recurrence does not belong to this task.');
    }

    const { error: updateError } = await supabase
      .from('recurrences')
      .update({ is_paused: true })
      .eq('id', parsed.recurrenceId);

    if (updateError) {
      throw updateError;
    }

    await logActivity(supabase, {
      taskId: parsed.taskId,
      actorId: user.id,
      eventType: 'recurrence_paused',
      payload: {}
    });

    revalidateTaskPaths(task.project_id);

    return { ok: true, data: { recurrenceId: parsed.recurrenceId } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function resumeTaskRecurrenceAction(input: {
  taskId: string;
  recurrenceId: string;
}): Promise<ActionResult<{ recurrenceId: string }>> {
  try {
    const parsed = resumeTaskRecurrenceSchema.parse(input);
    const { user, supabase } = await requireUser();

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, recurrence_id')
      .eq('id', parsed.taskId)
      .maybeSingle();

    if (taskError || !task) {
      throw taskError ?? new Error('Task not found.');
    }

    if (task.recurrence_id !== parsed.recurrenceId) {
      throw new Error('Recurrence does not belong to this task.');
    }

    const { error: updateError } = await supabase
      .from('recurrences')
      .update({ is_paused: false })
      .eq('id', parsed.recurrenceId);

    if (updateError) {
      throw updateError;
    }

    await logActivity(supabase, {
      taskId: parsed.taskId,
      actorId: user.id,
      eventType: 'recurrence_resumed',
      payload: {}
    });

    revalidateTaskPaths(task.project_id);

    return { ok: true, data: { recurrenceId: parsed.recurrenceId } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function clearTaskRecurrenceAction(input: {
  taskId: string;
  recurrenceId: string;
}): Promise<ActionResult<{ recurrenceId: string }>> {
  try {
    const parsed = clearTaskRecurrenceSchema.parse(input);
    const { user, supabase } = await requireUser();

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, recurrence_id')
      .eq('id', parsed.taskId)
      .maybeSingle();

    if (taskError || !task) {
      throw taskError ?? new Error('Task not found.');
    }

    if (task.recurrence_id !== parsed.recurrenceId) {
      throw new Error('Recurrence does not belong to this task.');
    }

    const { error: unlinkError } = await supabase
      .from('tasks')
      .update({ recurrence_id: null, updated_at: new Date().toISOString() })
      .eq('id', parsed.taskId);

    if (unlinkError) {
      throw unlinkError;
    }

    const { error: pauseError } = await supabase
      .from('recurrences')
      .update({ is_paused: true })
      .eq('id', parsed.recurrenceId);

    if (pauseError) {
      throw pauseError;
    }

    await logActivity(supabase, {
      taskId: parsed.taskId,
      actorId: user.id,
      eventType: 'recurrence_cleared',
      payload: {}
    });

    revalidateTaskPaths(task.project_id);

    return { ok: true, data: { recurrenceId: parsed.recurrenceId } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

async function logActivity(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  input: {
    taskId: string;
    actorId: string;
    eventType: string;
    payload: Record<string, unknown>;
  }
) {
  const { error } = await supabase.from('task_activity').insert({
    task_id: input.taskId,
    actor_id: input.actorId,
    event_type: input.eventType,
    payload_json: input.payload as Json
  });

  if (error) {
    throw error;
  }
}

function revalidateTaskPaths(projectId: string) {
  revalidatePath('/my-tasks');
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/inbox');
}
