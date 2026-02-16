'use server';

import { redirect } from 'next/navigation';
import { createWorkspaceAction, createProjectAction } from '@/lib/actions/project-actions';
import {
  addCommentAction,
  completeTaskAction,
  createTaskAction,
  moveTaskAction,
  updateTaskAction,
  uploadTaskAttachmentAction
} from '@/lib/actions/task-actions';
import { markNotificationReadAction } from '@/lib/actions/inbox-actions';

export async function createWorkspaceFromForm(formData: FormData) {
  const result = await createWorkspaceAction({
    name: String(formData.get('name') ?? ''),
    icon: String(formData.get('icon') ?? '') || undefined
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  redirect('/projects');
}

export async function createProjectFromForm(formData: FormData) {
  const result = await createProjectAction({
    workspaceId: String(formData.get('workspaceId') ?? ''),
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? '') || undefined,
    privacy:
      String(formData.get('privacy') ?? 'workspace_visible') === 'private'
        ? 'private'
        : 'workspace_visible'
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  redirect(`/projects/${result.data.projectId}`);
}

export async function createTaskFromForm(formData: FormData) {
  const dueAtLocal = String(formData.get('dueAtLocal') ?? '');
  const statusValue = formData.get('statusId');
  const sectionValue = formData.get('sectionId');
  const assigneeValue = formData.get('assigneeId');
  const parentTaskValue = formData.get('parentTaskId');
  const recurrenceValue = formData.get('recurrenceId');

  const result = await createTaskAction({
    projectId: String(formData.get('projectId') ?? ''),
    sectionId: sectionValue === null ? undefined : String(sectionValue) || null,
    statusId: statusValue === null ? undefined : String(statusValue) || undefined,
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? '') || undefined,
    assigneeId: assigneeValue === null ? undefined : String(assigneeValue) || undefined,
    dueAt: dueAtLocal ? new Date(dueAtLocal).toISOString() : null,
    dueTimezone: String(formData.get('dueTimezone') ?? '') || null,
    priority: parsePriority(formData.get('priority')),
    parentTaskId: parentTaskValue === null ? undefined : String(parentTaskValue) || null,
    recurrenceId: recurrenceValue === null ? undefined : String(recurrenceValue) || null,
    isToday: String(formData.get('isToday') ?? '') === 'on'
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function updateTaskFromForm(formData: FormData) {
  const dueAtLocal = String(formData.get('dueAtLocal') ?? '');
  const sortOrderValue = formData.get('sortOrder');
  const dueTimezoneValue = formData.get('dueTimezone');

  const result = await updateTaskAction({
    id: String(formData.get('id') ?? ''),
    title: String(formData.get('title') ?? '') || undefined,
    description: String(formData.get('description') ?? '') || undefined,
    assigneeId: String(formData.get('assigneeId') ?? '') || undefined,
    dueAt: dueAtLocal ? new Date(dueAtLocal).toISOString() : null,
    dueTimezone:
      dueTimezoneValue === null ? undefined : String(dueTimezoneValue) || null,
    statusId: String(formData.get('statusId') ?? '') || undefined,
    sectionId: String(formData.get('sectionId') ?? '') || null,
    priority: parsePriority(formData.get('priority')),
    isToday: String(formData.get('isToday') ?? '') === 'on',
    sortOrder:
      sortOrderValue === null || String(sortOrderValue) === ''
        ? undefined
        : Number(sortOrderValue)
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function moveTaskFromForm(formData: FormData) {
  const result = await moveTaskAction({
    id: String(formData.get('id') ?? ''),
    statusId: String(formData.get('statusId') ?? ''),
    sectionId: String(formData.get('sectionId') ?? '') || null,
    sortOrder: Number(formData.get('sortOrder') ?? 1)
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function completeTaskFromForm(formData: FormData) {
  const result = await completeTaskAction({
    id: String(formData.get('id') ?? '')
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function addCommentFromForm(formData: FormData) {
  const result = await addCommentAction({
    taskId: String(formData.get('taskId') ?? ''),
    body: String(formData.get('body') ?? '')
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function uploadTaskAttachmentFromForm(formData: FormData) {
  const fileEntry = formData.get('file');
  if (!(fileEntry instanceof File)) {
    throw new Error('No file provided.');
  }

  const result = await uploadTaskAttachmentAction({
    taskId: String(formData.get('taskId') ?? ''),
    file: fileEntry
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function markNotificationReadFromForm(formData: FormData) {
  const result = await markNotificationReadAction({
    id: String(formData.get('id') ?? '')
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

function parsePriority(value: FormDataEntryValue | null) {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }

  return null;
}
