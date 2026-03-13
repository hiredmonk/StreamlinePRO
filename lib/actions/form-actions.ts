'use server';

import { redirect } from 'next/navigation';
import {
  createWorkspaceAction,
  createProjectAction,
  createProjectStatusAction,
  deleteProjectStatusAction,
  reorderProjectStatusesAction,
  updateProjectStatusAction
} from '@/lib/actions/project-actions';
import {
  cancelWorkspaceInviteAction,
  createWorkspaceInviteAction,
  removeWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction
} from '@/lib/actions/workspace-actions';
import {
  addCommentAction,
  completeTaskAction,
  createFollowUpTaskAction,
  createTaskAction,
  moveTaskAction,
  updateTaskAction,
  uploadTaskAttachmentAction
} from '@/lib/actions/task-actions';
import {
  createTaskRecurrenceAction,
  updateTaskRecurrenceAction,
  pauseTaskRecurrenceAction,
  resumeTaskRecurrenceAction,
  clearTaskRecurrenceAction
} from '@/lib/actions/recurrence-actions';
import { markNotificationReadAction } from '@/lib/actions/inbox-actions';

export async function createWorkspaceFromForm(formData: FormData) {
  const result = await createWorkspaceAction({
    name: String(formData.get('name') ?? ''),
    icon: String(formData.get('icon') ?? '') || undefined
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  const redirectTo =
    String(formData.get('redirectTo') ?? 'workspace-detail') === 'workspace-directory'
      ? '/projects'
      : `/projects?workspace=${result.data.workspaceId}`;

  redirect(redirectTo);
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

export async function createWorkspaceInviteFromForm(formData: FormData) {
  const result = await createWorkspaceInviteAction({
    workspaceId: String(formData.get('workspaceId') ?? ''),
    email: String(formData.get('email') ?? ''),
    role: String(formData.get('role') ?? 'member') === 'admin' ? 'admin' : 'member'
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function cancelWorkspaceInviteFromForm(formData: FormData) {
  const result = await cancelWorkspaceInviteAction({
    inviteId: String(formData.get('inviteId') ?? '')
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function updateWorkspaceMemberRoleFromForm(formData: FormData) {
  const result = await updateWorkspaceMemberRoleAction({
    workspaceId: String(formData.get('workspaceId') ?? ''),
    userId: String(formData.get('userId') ?? ''),
    role: String(formData.get('role') ?? 'member') === 'admin' ? 'admin' : 'member'
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function removeWorkspaceMemberFromForm(formData: FormData) {
  const result = await removeWorkspaceMemberAction({
    workspaceId: String(formData.get('workspaceId') ?? ''),
    userId: String(formData.get('userId') ?? '')
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function createProjectStatusFromForm(formData: FormData) {
  const result = await createProjectStatusAction({
    projectId: String(formData.get('projectId') ?? ''),
    name: String(formData.get('name') ?? ''),
    color: String(formData.get('color') ?? '') || undefined,
    isDone: formData.get('isDone') === 'on'
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function updateProjectStatusFromForm(formData: FormData) {
  const statusId = String(formData.get('id') ?? '');
  const result = await updateProjectStatusAction({
    id: statusId,
    name: String(formData.get('name') ?? ''),
    color: String(formData.get('color') ?? ''),
    isDone: formData.get('isDone') === 'on'
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function reorderProjectStatusesFromForm(formData: FormData) {
  const orderedStatusIds = formData
    .getAll('orderedStatusIds')
    .map((value) => String(value))
    .filter(Boolean);

  const result = await reorderProjectStatusesAction({
    projectId: String(formData.get('projectId') ?? ''),
    orderedStatusIds
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function deleteProjectStatusFromForm(formData: FormData) {
  const result = await deleteProjectStatusAction({
    id: String(formData.get('id') ?? ''),
    fallbackStatusId: String(formData.get('fallbackStatusId') ?? '')
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
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
    assigneeId: assigneeValue === null ? undefined : String(assigneeValue) || null,
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
    assigneeId:
      formData.get('assigneeId') === null
        ? undefined
        : String(formData.get('assigneeId') ?? '') || null,
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
    sectionId: String(formData.get('sectionId') ?? '') || null
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

  const returnTo = String(formData.get('returnTo') ?? '');
  if (returnTo) {
    const url = new URL(returnTo, 'http://streamlinepro.local');
    if (result.data.recurringNextTaskId) {
      url.searchParams.set('recurring', '1');
    }
    redirect(buildSafeReturnPath(url));
  }
}

export async function createFollowUpTaskFromForm(formData: FormData) {
  const dueAtLocal = String(formData.get('dueAtLocal') ?? '');
  const assigneeValue = formData.get('assigneeId');

  const result = await createFollowUpTaskAction({
    sourceTaskId: String(formData.get('sourceTaskId') ?? ''),
    title: String(formData.get('title') ?? ''),
    assigneeId: assigneeValue === null ? undefined : String(assigneeValue) || null,
    priority: parsePriority(formData.get('priority')),
    dueAt: dueAtLocal ? new Date(dueAtLocal).toISOString() : null,
    dueTimezone: String(formData.get('dueTimezone') ?? '') || null
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  const returnTo = String(formData.get('returnTo') ?? '');
  if (returnTo) {
    redirect(buildSafeReturnPath(new URL(returnTo, 'http://streamlinepro.local')));
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

export async function createTaskRecurrenceFromForm(formData: FormData) {
  const result = await createTaskRecurrenceAction({
    taskId: String(formData.get('taskId') ?? ''),
    frequency: String(formData.get('frequency') ?? ''),
    interval: Number(formData.get('interval') ?? 1)
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function updateTaskRecurrenceFromForm(formData: FormData) {
  const result = await updateTaskRecurrenceAction({
    taskId: String(formData.get('taskId') ?? ''),
    recurrenceId: String(formData.get('recurrenceId') ?? ''),
    frequency: String(formData.get('frequency') ?? ''),
    interval: Number(formData.get('interval') ?? 1)
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function pauseTaskRecurrenceFromForm(formData: FormData) {
  const result = await pauseTaskRecurrenceAction({
    taskId: String(formData.get('taskId') ?? ''),
    recurrenceId: String(formData.get('recurrenceId') ?? '')
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function resumeTaskRecurrenceFromForm(formData: FormData) {
  const result = await resumeTaskRecurrenceAction({
    taskId: String(formData.get('taskId') ?? ''),
    recurrenceId: String(formData.get('recurrenceId') ?? '')
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

export async function clearTaskRecurrenceFromForm(formData: FormData) {
  const result = await clearTaskRecurrenceAction({
    taskId: String(formData.get('taskId') ?? ''),
    recurrenceId: String(formData.get('recurrenceId') ?? '')
  });

  if (!result.ok) {
    throw new Error(result.error);
  }
}

function buildSafeReturnPath(url: URL) {
  return `${url.pathname}${url.search}`;
}

function parsePriority(value: FormDataEntryValue | null) {
  if (value === 'low' || value === 'medium' || value === 'high') {
    return value;
  }

  return null;
}
