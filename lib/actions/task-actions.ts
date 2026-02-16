'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createNotification } from '@/lib/domain/inbox/events';
import { getNextDueDate, parseRecurrencePattern } from '@/lib/domain/tasks/recurrence';
import { createTaskSchema, updateTaskSchema, completeTaskSchema, moveTaskSchema, createCommentSchema } from '@/lib/validators/task';
import { getServerEnv } from '@/lib/env';
import { toErrorMessage } from '@/lib/utils';
import type { ActionResult } from '@/lib/actions/types';
import type { Json } from '@/lib/supabase/types';

export async function createTaskAction(input: {
  projectId: string;
  sectionId?: string | null;
  statusId?: string;
  title: string;
  description?: string;
  assigneeId?: string | null;
  dueAt?: string | null;
  dueTimezone?: string | null;
  priority?: 'low' | 'medium' | 'high' | null;
  parentTaskId?: string | null;
  recurrenceId?: string | null;
  isToday?: boolean;
}): Promise<ActionResult<{ taskId: string }>> {
  try {
    const { user, supabase } = await requireUser();

    let statusId = input.statusId;
    if (!statusId) {
      const { data: defaultStatus, error: statusError } = await supabase
        .from('project_statuses')
        .select('id')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (statusError || !defaultStatus) {
        throw statusError ?? new Error('Project has no statuses configured.');
      }

      statusId = defaultStatus.id;
    }

    let sectionId = input.sectionId;
    if (sectionId === undefined) {
      const { data: defaultSection } = await supabase
        .from('project_sections')
        .select('id')
        .eq('project_id', input.projectId)
        .order('sort_order', { ascending: true })
        .limit(1)
        .maybeSingle();

      sectionId = defaultSection?.id ?? null;
    }

    const parsed = createTaskSchema.parse({
      ...input,
      statusId,
      sectionId,
      assigneeId: input.assigneeId ?? user.id
    });

    const { data: orderRows, error: orderError } = await supabase
      .from('tasks')
      .select('sort_order')
      .eq('project_id', parsed.projectId)
      .order('sort_order', { ascending: false })
      .limit(1);

    if (orderError) {
      throw orderError;
    }

    const nextSortOrder = (orderRows?.[0]?.sort_order ?? 0) + 1;
    const taskId = randomUUID();

    const { error } = await supabase
      .from('tasks')
      .insert({
        id: taskId,
        project_id: parsed.projectId,
        section_id: parsed.sectionId ?? null,
        status_id: parsed.statusId,
        title: parsed.title,
        description: parsed.description ?? null,
        assignee_id: parsed.assigneeId ?? user.id,
        creator_id: user.id,
        due_at: parsed.dueAt ?? null,
        due_timezone: parsed.dueTimezone ?? null,
        priority: parsed.priority ?? null,
        parent_task_id: parsed.parentTaskId ?? null,
        recurrence_id: parsed.recurrenceId ?? null,
        is_today: parsed.isToday ?? false,
        sort_order: nextSortOrder
      });

    if (error) {
      throw error ?? new Error('Task was not created.');
    }

    await logActivity(supabase, {
      taskId,
      actorId: user.id,
      eventType: 'task_created',
      payload: { title: parsed.title }
    });

    if (parsed.assigneeId && parsed.assigneeId !== user.id) {
      const workspaceId = await getWorkspaceIdByProjectId(supabase, parsed.projectId);

      await createNotification(supabase, {
        workspaceId,
        userId: parsed.assigneeId,
        type: 'assignment',
        entityType: 'task',
        entityId: taskId,
        payload: { actorId: user.id, title: parsed.title }
      });
    }

    revalidateTaskPaths(parsed.projectId);

    return { ok: true, data: { taskId } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function updateTaskAction(input: {
  id: string;
  title?: string;
  description?: string;
  assigneeId?: string | null;
  dueAt?: string | null;
  dueTimezone?: string | null;
  statusId?: string;
  sectionId?: string | null;
  priority?: 'low' | 'medium' | 'high' | null;
  isToday?: boolean;
  completedAt?: string | null;
  sortOrder?: number;
}): Promise<ActionResult<{ taskId: string }>> {
  try {
    const parsed = updateTaskSchema.parse(input);
    const { user, supabase } = await requireUser();

    const { data: existingTask, error: existingTaskError } = await supabase
      .from('tasks')
      .select('id, project_id, assignee_id, title')
      .eq('id', parsed.id)
      .maybeSingle();

    if (existingTaskError || !existingTask) {
      throw existingTaskError ?? new Error('Task not found.');
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        title: parsed.title,
        description: parsed.description,
        assignee_id: parsed.assigneeId,
        due_at: parsed.dueAt,
        due_timezone: parsed.dueTimezone,
        status_id: parsed.statusId,
        section_id: parsed.sectionId,
        priority: parsed.priority,
        is_today: parsed.isToday,
        completed_at: parsed.completedAt,
        sort_order: parsed.sortOrder,
        updated_at: new Date().toISOString()
      })
      .eq('id', parsed.id);

    if (error) {
      throw error;
    }

    await logActivity(supabase, {
      taskId: parsed.id,
      actorId: user.id,
      eventType: 'task_updated',
      payload: { fields: Object.keys(parsed) }
    });

    if (parsed.assigneeId && parsed.assigneeId !== existingTask.assignee_id && parsed.assigneeId !== user.id) {
      const workspaceId = await getWorkspaceIdByProjectId(supabase, existingTask.project_id);

      await createNotification(supabase, {
        workspaceId,
        userId: parsed.assigneeId,
        type: 'assignment',
        entityType: 'task',
        entityId: parsed.id,
        payload: { actorId: user.id, title: parsed.title ?? existingTask.title }
      });
    }

    revalidateTaskPaths(existingTask.project_id);

    return { ok: true, data: { taskId: parsed.id } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function moveTaskAction(input: {
  id: string;
  statusId: string;
  sectionId?: string | null;
  sortOrder: number;
}): Promise<ActionResult<{ taskId: string }>> {
  try {
    const parsed = moveTaskSchema.parse(input);
    const { user, supabase } = await requireUser();

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('project_id')
      .eq('id', parsed.id)
      .maybeSingle();

    if (taskError || !task) {
      throw taskError ?? new Error('Task not found.');
    }

    const { error } = await supabase
      .from('tasks')
      .update({
        status_id: parsed.statusId,
        section_id: parsed.sectionId ?? null,
        sort_order: parsed.sortOrder,
        updated_at: new Date().toISOString()
      })
      .eq('id', parsed.id);

    if (error) {
      throw error;
    }

    await logActivity(supabase, {
      taskId: parsed.id,
      actorId: user.id,
      eventType: 'task_moved',
      payload: { statusId: parsed.statusId, sectionId: parsed.sectionId }
    });

    revalidateTaskPaths(task.project_id);

    return { ok: true, data: { taskId: parsed.id } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function completeTaskAction(input: { id: string }): Promise<ActionResult<{ taskId: string }>> {
  try {
    const parsed = completeTaskSchema.parse(input);
    const { user, supabase } = await requireUser();

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, due_at, recurrence_id, title')
      .eq('id', parsed.id)
      .maybeSingle();

    if (taskError || !task) {
      throw taskError ?? new Error('Task not found.');
    }

    const { data: doneStatus, error: statusError } = await supabase
      .from('project_statuses')
      .select('id')
      .eq('project_id', task.project_id)
      .eq('is_done', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (statusError || !doneStatus) {
      throw statusError ?? new Error('Project is missing a done status.');
    }

    const completedAt = new Date().toISOString();

    const { error } = await supabase
      .from('tasks')
      .update({
        status_id: doneStatus.id,
        completed_at: completedAt,
        updated_at: completedAt
      })
      .eq('id', parsed.id);

    if (error) {
      throw error;
    }

    await logActivity(supabase, {
      taskId: parsed.id,
      actorId: user.id,
      eventType: 'task_completed',
      payload: { completedAt }
    });

    if (task.recurrence_id) {
      await createNextTaskFromRecurrence(supabase, {
        completedTaskId: task.id,
        recurrenceId: task.recurrence_id,
        actorId: user.id
      });
    }

    revalidateTaskPaths(task.project_id);

    return { ok: true, data: { taskId: task.id } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function addCommentAction(input: {
  taskId: string;
  body: string;
}): Promise<ActionResult<{ commentId: string }>> {
  try {
    const parsed = createCommentSchema.parse(input);
    const { user, supabase } = await requireUser();

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, assignee_id')
      .eq('id', parsed.taskId)
      .maybeSingle();

    if (taskError || !task) {
      throw taskError ?? new Error('Task not found.');
    }

    const { data: comment, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: parsed.taskId,
        user_id: user.id,
        body: parsed.body
      })
      .select('id')
      .single();

    if (error || !comment) {
      throw error ?? new Error('Comment was not created.');
    }

    await logActivity(supabase, {
      taskId: parsed.taskId,
      actorId: user.id,
      eventType: 'comment_added',
      payload: { bodyLength: parsed.body.length }
    });

    const workspaceId = await getWorkspaceIdByProjectId(supabase, task.project_id);
    const hasMentionSyntax = parsed.body.includes('@');
    const mentionedUserIds = hasMentionSyntax
      ? await resolveMentionedUserIds(supabase, workspaceId, parsed.body)
      : new Set<string>();

    // Preserve assignee notification behavior while fanning out real mentions.
    if (task.assignee_id && task.assignee_id !== user.id && !mentionedUserIds.has(task.assignee_id)) {
      await createNotification(supabase, {
        workspaceId,
        userId: task.assignee_id,
        type: hasMentionSyntax ? 'mention' : 'comment',
        entityType: 'comment',
        entityId: comment.id,
        payload: { taskId: parsed.taskId, actorId: user.id }
      });
    }

    for (const mentionedUserId of mentionedUserIds) {
      if (mentionedUserId === user.id) {
        continue;
      }

      await createNotification(supabase, {
        workspaceId,
        userId: mentionedUserId,
        type: 'mention',
        entityType: 'comment',
        entityId: comment.id,
        payload: { taskId: parsed.taskId, actorId: user.id }
      });
    }

    revalidateTaskPaths(task.project_id);

    return { ok: true, data: { commentId: comment.id } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function uploadTaskAttachmentAction(input: {
  taskId: string;
  file: File;
}): Promise<ActionResult<{ attachmentId: string }>> {
  try {
    const { user, supabase } = await requireUser();
    const env = getServerEnv();

    if (!input.file || input.file.size === 0) {
      throw new Error('Please choose a non-empty file.');
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select(
        `
        id,
        project_id,
        projects!tasks_project_id_fkey (
          workspace_id
        )
      `
      )
      .eq('id', input.taskId)
      .maybeSingle();

    if (taskError || !task) {
      throw taskError ?? new Error('Task not found.');
    }

    const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
    const workspaceId = project?.workspace_id;

    if (!workspaceId) {
      throw new Error('Unable to resolve workspace for attachment.');
    }

    const safeFileName = input.file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
    const storagePath = `${workspaceId}/${input.taskId}/${Date.now()}-${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from(env.SUPABASE_STORAGE_BUCKET_ATTACHMENTS)
      .upload(storagePath, input.file, { upsert: false });

    if (uploadError) {
      throw uploadError;
    }

    const { data: attachment, error: attachmentError } = await supabase
      .from('task_attachments')
      .insert({
        task_id: input.taskId,
        storage_path: storagePath,
        file_name: input.file.name,
        mime_type: input.file.type || 'application/octet-stream',
        size: input.file.size,
        uploaded_by: user.id
      })
      .select('id')
      .single();

    if (attachmentError || !attachment) {
      throw attachmentError ?? new Error('Attachment metadata could not be saved.');
    }

    await logActivity(supabase, {
      taskId: input.taskId,
      actorId: user.id,
      eventType: 'attachment_uploaded',
      payload: { fileName: input.file.name, size: input.file.size }
    });

    const workspaceIdFromProject = await getWorkspaceIdByProjectId(supabase, task.project_id);
    await createNotification(supabase, {
      workspaceId: workspaceIdFromProject,
      userId: user.id,
      type: 'system',
      entityType: 'task',
      entityId: input.taskId,
      payload: { message: 'Attachment uploaded', fileName: input.file.name }
    });

    revalidateTaskPaths(task.project_id);

    return { ok: true, data: { attachmentId: attachment.id } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

async function createNextTaskFromRecurrence(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  input: {
    completedTaskId: string;
    recurrenceId: string;
    actorId: string;
  }
) {
  const { data: completedTask, error: completedTaskError } = await supabase
    .from('tasks')
    .select(
      'id, project_id, section_id, status_id, title, description, assignee_id, creator_id, due_at, due_timezone, priority, is_today, recurrence_id'
    )
    .eq('id', input.completedTaskId)
    .maybeSingle();

  if (completedTaskError || !completedTask || !completedTask.due_at) {
    throw completedTaskError ?? new Error('Unable to resolve completed task for recurrence.');
  }

  const { data: recurrence, error: recurrenceError } = await supabase
    .from('recurrences')
    .select('id, pattern_json, is_paused')
    .eq('id', input.recurrenceId)
    .maybeSingle();

  if (recurrenceError || !recurrence || recurrence.is_paused) {
    return;
  }

  const pattern = parseRecurrencePattern(recurrence.pattern_json);
  if (!pattern) {
    return;
  }

  const nextDueAt = getNextDueDate(new Date(completedTask.due_at), pattern).toISOString();

  const { data: firstOpenStatus, error: statusError } = await supabase
    .from('project_statuses')
    .select('id')
    .eq('project_id', completedTask.project_id)
    .eq('is_done', false)
    .order('sort_order', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (statusError || !firstOpenStatus) {
    throw statusError ?? new Error('No open status found for recurring task creation.');
  }

  const { data: orderRows, error: orderError } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('project_id', completedTask.project_id)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (orderError) {
    throw orderError;
  }

  const nextSortOrder = (orderRows?.[0]?.sort_order ?? 0) + 1;

  const { data: nextTask, error: nextTaskError } = await supabase
    .from('tasks')
    .insert({
      project_id: completedTask.project_id,
      section_id: completedTask.section_id,
      status_id: firstOpenStatus.id,
      title: completedTask.title,
      description: completedTask.description,
      assignee_id: completedTask.assignee_id,
      creator_id: completedTask.creator_id,
      due_at: nextDueAt,
      due_timezone: completedTask.due_timezone,
      priority: completedTask.priority,
      recurrence_id: completedTask.recurrence_id,
      is_today: false,
      sort_order: nextSortOrder
    })
    .select('id')
    .single();

  if (nextTaskError || !nextTask) {
    throw nextTaskError ?? new Error('Recurring task generation failed.');
  }

  await logActivity(supabase, {
    taskId: nextTask.id,
    actorId: input.actorId,
    eventType: 'recurrence_generated',
    payload: { sourceTaskId: input.completedTaskId }
  });
}

async function getWorkspaceIdByProjectId(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  projectId: string
) {
  const { data: project, error } = await supabase
    .from('projects')
    .select('workspace_id')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !project) {
    throw error ?? new Error('Project workspace could not be resolved.');
  }

  return project.workspace_id;
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

async function resolveMentionedUserIds(
  supabase: Awaited<ReturnType<typeof requireUser>>['supabase'],
  workspaceId: string,
  body: string
) {
  const mentionSelectors = extractMentionSelectors(body);
  if (!mentionSelectors.exactIds.size && !mentionSelectors.idPrefixes.size) {
    return new Set<string>();
  }

  const { data: workspaceMembers, error } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId);

  if (error) {
    throw error;
  }

  const mentionedUserIds = new Set<string>();

  for (const member of workspaceMembers ?? []) {
    const userId = member.user_id;
    const normalizedUserId = userId.toLowerCase();

    if (mentionSelectors.exactIds.has(normalizedUserId)) {
      mentionedUserIds.add(userId);
      continue;
    }

    for (const prefix of mentionSelectors.idPrefixes) {
      if (normalizedUserId.startsWith(prefix)) {
        mentionedUserIds.add(userId);
        break;
      }
    }
  }

  return mentionedUserIds;
}

function extractMentionSelectors(body: string) {
  const exactIds = new Set<string>();
  const idPrefixes = new Set<string>();

  const bracketedMentionRegex = /@\[([0-9a-fA-F-]{36})\]/g;
  const inlineMentionRegex = /@([0-9a-fA-F-]{8,36})\b/g;

  for (const match of body.matchAll(bracketedMentionRegex)) {
    const candidate = match[1]?.toLowerCase();
    if (candidate && isUuid(candidate)) {
      exactIds.add(candidate);
    }
  }

  for (const match of body.matchAll(inlineMentionRegex)) {
    const candidate = match[1]?.toLowerCase();
    if (!candidate) {
      continue;
    }

    if (isUuid(candidate)) {
      exactIds.add(candidate);
      continue;
    }

    if (candidate.length >= 8) {
      idPrefixes.add(candidate);
    }
  }

  return { exactIds, idPrefixes };
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
