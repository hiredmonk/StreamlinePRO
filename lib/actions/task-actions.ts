'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import type {
  BoardConflictInfo,
  FetchBoardOrderStateInput,
  FetchBoardOrderStateOutput,
  MoveTaskWithConcurrencyInput,
  MoveTaskWithConcurrencyOutput,
  ReorderBoardColumnInput,
  ReorderBoardColumnOutput
} from '@/lib/contracts/board-concurrent-ordering';
import { createNotification } from '@/lib/domain/inbox/events';
import { getNextDueDate, parseRecurrencePattern } from '@/lib/domain/tasks/recurrence';
import {
  createTaskSchema,
  updateTaskSchema,
  completeTaskSchema,
  moveTaskSchema,
  createCommentSchema,
  moveTaskWithConcurrencySchema,
  reorderBoardColumnSchema,
  fetchBoardOrderStateSchema
} from '@/lib/validators/task';
import { getServerEnv } from '@/lib/env';
import { toErrorMessage } from '@/lib/utils';
import type { ActionResult } from '@/lib/actions/types';
import type { Json } from '@/lib/supabase/types';

type ServerSupabaseClient = Awaited<ReturnType<typeof requireUser>>['supabase'];
type BoardLaneRow = {
  id: string;
  project_id: string;
  lane_version: number;
};
type OrderedTaskRow = {
  id: string;
  status_id: string;
  section_id: string | null;
  sort_order: number;
};

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

export async function moveTaskWithConcurrencyAction(
  input: MoveTaskWithConcurrencyInput
): Promise<ActionResult<MoveTaskWithConcurrencyOutput>> {
  try {
    const parsed = moveTaskWithConcurrencySchema.parse(input);
    const { user, supabase } = await requireUser();

    if (parsed.actorUserId !== user.id) {
      throw new Error('Actor mismatch for board move.');
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('id, project_id, status_id, section_id, sort_order')
      .eq('id', parsed.taskId)
      .maybeSingle();

    if (taskError || !task) {
      throw taskError ?? new Error('Task not found.');
    }

    if (task.project_id !== parsed.projectId) {
      throw new Error('Task does not belong to the provided project.');
    }

    const destinationLane = await getBoardLane(supabase, parsed.projectId, parsed.toStatusId);

    if (!destinationLane) {
      return {
        ok: true,
        data: buildMoveConflictOutput(
          parsed,
          buildBoardConflict({
            projectId: parsed.projectId,
            statusId: parsed.toStatusId,
            expectedVersion: parsed.expectedLaneVersion,
            actualVersion: -1,
            reason: 'invalid_lane'
          }),
          task
        )
      };
    }

    let sourceLane: BoardLaneRow | null = destinationLane;
    if (parsed.fromStatusId !== parsed.toStatusId) {
      sourceLane = await getBoardLane(supabase, parsed.projectId, parsed.fromStatusId);
      if (!sourceLane) {
        return {
          ok: true,
          data: buildMoveConflictOutput(
            parsed,
            buildBoardConflict({
              projectId: parsed.projectId,
              statusId: parsed.fromStatusId,
              expectedVersion: parsed.expectedLaneVersion,
              actualVersion: -1,
              reason: 'invalid_lane'
            }),
            task
          )
        };
      }
    }

    if (task.status_id !== parsed.fromStatusId) {
      return {
        ok: true,
        data: buildMoveConflictOutput(
          parsed,
          buildBoardConflict({
            projectId: parsed.projectId,
            statusId: parsed.fromStatusId,
            expectedVersion: parsed.expectedLaneVersion,
            actualVersion: sourceLane?.lane_version ?? -1,
            reason: 'missing_task'
          }),
          task
        )
      };
    }

    if (parsed.toSectionId) {
      const { data: section, error: sectionError } = await supabase
        .from('project_sections')
        .select('id, project_id')
        .eq('id', parsed.toSectionId)
        .maybeSingle();

      if (sectionError || !section || section.project_id !== parsed.projectId) {
        return {
          ok: true,
          data: buildMoveConflictOutput(
            parsed,
            buildBoardConflict({
              projectId: parsed.projectId,
              statusId: parsed.toStatusId,
              expectedVersion: parsed.expectedLaneVersion,
              actualVersion: destinationLane.lane_version,
              reason: 'invalid_lane'
            }),
            task
          )
        };
      }
    }

    const destinationRows = await getOrderedTasksForLane(supabase, parsed.projectId, parsed.toStatusId);
    if (hasDuplicateSortOrders(destinationRows)) {
      return {
        ok: true,
        data: buildMoveConflictOutput(
          parsed,
          buildBoardConflict({
            projectId: parsed.projectId,
            statusId: parsed.toStatusId,
            expectedVersion: parsed.expectedLaneVersion,
            actualVersion: destinationLane.lane_version,
            reason: 'duplicate_sort_order'
          }),
          task
        )
      };
    }

    let sourceRows: OrderedTaskRow[] = [];
    if (parsed.fromStatusId !== parsed.toStatusId) {
      sourceRows = await getOrderedTasksForLane(supabase, parsed.projectId, parsed.fromStatusId);

      if (hasDuplicateSortOrders(sourceRows)) {
        return {
          ok: true,
          data: buildMoveConflictOutput(
            parsed,
            buildBoardConflict({
              projectId: parsed.projectId,
              statusId: parsed.fromStatusId,
              expectedVersion: parsed.expectedLaneVersion,
              actualVersion: sourceLane?.lane_version ?? -1,
              reason: 'duplicate_sort_order'
            }),
            task
          )
        };
      }
    }

    const destinationTaskIds = destinationRows
      .map((row) => row.id)
      .filter((taskId) => taskId !== task.id);
    const clampedTargetIndex = clampTargetIndex(parsed.targetIndex, destinationTaskIds.length);
    destinationTaskIds.splice(clampedTargetIndex, 0, task.id);

    const versionResult = await tryBumpLaneVersion(supabase, {
      projectId: parsed.projectId,
      statusId: parsed.toStatusId,
      expectedLaneVersion: parsed.expectedLaneVersion
    });

    if (!versionResult.ok) {
      return {
        ok: true,
        data: buildMoveConflictOutput(
          parsed,
          buildBoardConflict({
            projectId: parsed.projectId,
            statusId: parsed.toStatusId,
            expectedVersion: parsed.expectedLaneVersion,
            actualVersion: versionResult.actualVersion,
            reason: 'version_mismatch'
          }),
          task
        )
      };
    }

    await persistLaneTaskOrder(supabase, {
      orderedTaskIds: destinationTaskIds,
      movedTaskId: task.id,
      movedTaskStatusId: parsed.toStatusId,
      movedTaskSectionId: parsed.toSectionId ?? null
    });

    if (parsed.fromStatusId !== parsed.toStatusId) {
      const sourceTaskIds = sourceRows
        .map((row) => row.id)
        .filter((taskId) => taskId !== task.id);

      await persistLaneTaskOrder(supabase, {
        orderedTaskIds: sourceTaskIds
      });

      await incrementLaneVersionBestEffort(supabase, parsed.projectId, parsed.fromStatusId);
    }

    await logActivity(supabase, {
      taskId: task.id,
      actorId: user.id,
      eventType: 'task_moved',
      payload: {
        fromStatusId: parsed.fromStatusId,
        toStatusId: parsed.toStatusId,
        targetIndex: clampedTargetIndex,
        laneVersion: versionResult.laneVersion
      }
    });

    revalidateTaskPaths(parsed.projectId);

    return {
      ok: true,
      data: {
        taskId: task.id,
        projectId: parsed.projectId,
        statusId: parsed.toStatusId,
        sectionId: parsed.toSectionId ?? null,
        sortOrder: clampedTargetIndex + 1,
        laneVersion: versionResult.laneVersion
      }
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function reorderBoardColumnAction(
  input: ReorderBoardColumnInput
): Promise<ActionResult<ReorderBoardColumnOutput>> {
  try {
    const parsed = reorderBoardColumnSchema.parse(input);
    const { user, supabase } = await requireUser();

    if (parsed.actorUserId !== user.id) {
      throw new Error('Actor mismatch for board reorder.');
    }

    const lane = await getBoardLane(supabase, parsed.projectId, parsed.statusId);
    if (!lane) {
      return {
        ok: true,
        data: buildReorderConflictOutput(
          parsed,
          buildBoardConflict({
            projectId: parsed.projectId,
            statusId: parsed.statusId,
            expectedVersion: parsed.expectedLaneVersion,
            actualVersion: -1,
            reason: 'invalid_lane'
          })
        )
      };
    }

    const existingRows = await getOrderedTasksForLane(supabase, parsed.projectId, parsed.statusId);
    if (hasDuplicateSortOrders(existingRows)) {
      return {
        ok: true,
        data: buildReorderConflictOutput(
          parsed,
          buildBoardConflict({
            projectId: parsed.projectId,
            statusId: parsed.statusId,
            expectedVersion: parsed.expectedLaneVersion,
            actualVersion: lane.lane_version,
            reason: 'duplicate_sort_order'
          })
        )
      };
    }

    const currentTaskIds = existingRows.map((row) => row.id);
    if (!hasExactTaskSet(currentTaskIds, parsed.orderedTaskIds)) {
      return {
        ok: true,
        data: buildReorderConflictOutput(
          parsed,
          buildBoardConflict({
            projectId: parsed.projectId,
            statusId: parsed.statusId,
            expectedVersion: parsed.expectedLaneVersion,
            actualVersion: lane.lane_version,
            reason: 'missing_task'
          })
        )
      };
    }

    const versionResult = await tryBumpLaneVersion(supabase, {
      projectId: parsed.projectId,
      statusId: parsed.statusId,
      expectedLaneVersion: parsed.expectedLaneVersion
    });

    if (!versionResult.ok) {
      return {
        ok: true,
        data: buildReorderConflictOutput(
          parsed,
          buildBoardConflict({
            projectId: parsed.projectId,
            statusId: parsed.statusId,
            expectedVersion: parsed.expectedLaneVersion,
            actualVersion: versionResult.actualVersion,
            reason: 'version_mismatch'
          })
        )
      };
    }

    await persistLaneTaskOrder(supabase, {
      orderedTaskIds: parsed.orderedTaskIds
    });

    revalidateTaskPaths(parsed.projectId);

    return {
      ok: true,
      data: {
        projectId: parsed.projectId,
        statusId: parsed.statusId,
        laneVersion: versionResult.laneVersion,
        updatedTaskIds: parsed.orderedTaskIds
      }
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function fetchBoardOrderStateQuery(
  input: FetchBoardOrderStateInput
): Promise<FetchBoardOrderStateOutput> {
  const parsed = fetchBoardOrderStateSchema.parse(input);
  const { supabase } = await requireUser();

  let laneQuery = supabase
    .from('project_statuses')
    .select('id, project_id, lane_version')
    .eq('project_id', parsed.projectId)
    .order('sort_order', { ascending: true });

  if (parsed.statusId) {
    laneQuery = laneQuery.eq('id', parsed.statusId);
  }

  const { data: laneRows, error: laneError } = await laneQuery;

  if (laneError) {
    throw laneError;
  }

  const lanes: FetchBoardOrderStateOutput['lanes'] = [];

  for (const lane of laneRows ?? []) {
    const laneTasks = await getOrderedTasksForLane(supabase, parsed.projectId, lane.id);

    lanes.push({
      projectId: parsed.projectId,
      statusId: lane.id,
      laneVersion: lane.lane_version,
      orderedTaskIds: laneTasks.map((task) => task.id)
    });
  }

  return { lanes };
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

async function getBoardLane(
  supabase: ServerSupabaseClient,
  projectId: string,
  statusId: string
): Promise<BoardLaneRow | null> {
  const { data, error } = await supabase
    .from('project_statuses')
    .select('id, project_id, lane_version')
    .eq('project_id', projectId)
    .eq('id', statusId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

async function getOrderedTasksForLane(
  supabase: ServerSupabaseClient,
  projectId: string,
  statusId: string
): Promise<OrderedTaskRow[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('id, status_id, section_id, sort_order')
    .eq('project_id', projectId)
    .eq('status_id', statusId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

function clampTargetIndex(targetIndex: number, laneLength: number) {
  if (targetIndex < 0) {
    return 0;
  }

  if (targetIndex > laneLength) {
    return laneLength;
  }

  return targetIndex;
}

function hasDuplicateSortOrders(tasks: OrderedTaskRow[]) {
  const seen = new Set<number>();

  for (const task of tasks) {
    if (seen.has(task.sort_order)) {
      return true;
    }
    seen.add(task.sort_order);
  }

  return false;
}

function hasExactTaskSet(currentTaskIds: string[], nextTaskIds: string[]) {
  if (currentTaskIds.length !== nextTaskIds.length) {
    return false;
  }

  const expected = new Set(currentTaskIds);
  return nextTaskIds.every((taskId) => expected.has(taskId));
}

async function tryBumpLaneVersion(
  supabase: ServerSupabaseClient,
  input: {
    projectId: string;
    statusId: string;
    expectedLaneVersion: number;
  }
): Promise<{ ok: true; laneVersion: number } | { ok: false; actualVersion: number }> {
  const { data: updatedLane, error: updateError } = await supabase
    .from('project_statuses')
    .update({ lane_version: input.expectedLaneVersion + 1 })
    .eq('project_id', input.projectId)
    .eq('id', input.statusId)
    .eq('lane_version', input.expectedLaneVersion)
    .select('lane_version')
    .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (updatedLane) {
    return { ok: true, laneVersion: updatedLane.lane_version };
  }

  const actualLane = await getBoardLane(supabase, input.projectId, input.statusId);
  return { ok: false, actualVersion: actualLane?.lane_version ?? -1 };
}

async function incrementLaneVersionBestEffort(
  supabase: ServerSupabaseClient,
  projectId: string,
  statusId: string
) {
  const lane = await getBoardLane(supabase, projectId, statusId);
  if (!lane) {
    return;
  }

  const { error } = await supabase
    .from('project_statuses')
    .update({ lane_version: lane.lane_version + 1 })
    .eq('id', statusId)
    .eq('project_id', projectId)
    .eq('lane_version', lane.lane_version);

  if (error) {
    throw error;
  }
}

async function persistLaneTaskOrder(
  supabase: ServerSupabaseClient,
  input: {
    orderedTaskIds: string[];
    movedTaskId?: string;
    movedTaskStatusId?: string;
    movedTaskSectionId?: string | null;
  }
) {
  for (const [index, taskId] of input.orderedTaskIds.entries()) {
    const updatePayload: {
      sort_order: number;
      updated_at: string;
      status_id?: string;
      section_id?: string | null;
    } = {
      sort_order: index + 1,
      updated_at: new Date().toISOString()
    };

    if (input.movedTaskId === taskId && input.movedTaskStatusId) {
      updatePayload.status_id = input.movedTaskStatusId;
      updatePayload.section_id = input.movedTaskSectionId ?? null;
    }

    const { error } = await supabase
      .from('tasks')
      .update(updatePayload)
      .eq('id', taskId);

    if (error) {
      throw error;
    }
  }
}

function buildBoardConflict(input: BoardConflictInfo): BoardConflictInfo {
  return input;
}

function buildMoveConflictOutput(
  input: MoveTaskWithConcurrencyInput,
  conflict: BoardConflictInfo,
  task: {
    status_id: string;
    section_id: string | null;
    sort_order: number;
  }
): MoveTaskWithConcurrencyOutput {
  return {
    taskId: input.taskId,
    projectId: input.projectId,
    statusId: task.status_id,
    sectionId: task.section_id,
    sortOrder: task.sort_order,
    laneVersion: conflict.actualVersion,
    conflict
  };
}

function buildReorderConflictOutput(
  input: ReorderBoardColumnInput,
  conflict: BoardConflictInfo
): ReorderBoardColumnOutput {
  return {
    projectId: input.projectId,
    statusId: input.statusId,
    laneVersion: conflict.actualVersion,
    updatedTaskIds: [],
    conflict
  };
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
