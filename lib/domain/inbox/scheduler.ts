import type { AppSupabaseClient } from '@/lib/supabase/client-types';
import type { Database, Json } from '@/lib/supabase/types';

type NotificationType = Database['public']['Tables']['notifications']['Insert']['type'];
type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];
type TaskRow = {
  id: string;
  due_at: string | null;
  assignee_id: string | null;
  completed_at: string | null;
  status_id: string;
  project_id: string;
};

function getDueNotificationType(
  dueAt: string,
  now: Date,
  dueSoonCutoff: Date
): NotificationType | null {
  const dueDate = new Date(dueAt);
  if (Number.isNaN(dueDate.getTime())) {
    return null;
  }

  if (dueDate <= now) {
    return 'overdue';
  }

  if (dueDate <= dueSoonCutoff) {
    return 'due_soon';
  }

  return null;
}

export async function generateDueNotifications(
  supabase: AppSupabaseClient,
  options: { now?: Date; dueSoonHours?: number } = {}
) {
  const now = options.now ?? new Date();
  const dueSoonHours = options.dueSoonHours ?? 24;
  const dueSoonCutoff = new Date(now.getTime() + dueSoonHours * 60 * 60 * 1000);

  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, due_at, assignee_id, completed_at, status_id, project_id');

  if (tasksError) {
    throw tasksError;
  }

  const dueCandidates = ((tasks ?? []) as unknown as TaskRow[]);
  if (!dueCandidates.length) {
    return {
      scanned: 0,
      candidates: 0,
      created: 0,
      skipped: 0
    };
  }

  const statusIds = [...new Set(dueCandidates.map((task) => task.status_id))];
  const projectIds = [...new Set(dueCandidates.map((task) => task.project_id))];

  const [{ data: statuses, error: statusesError }, { data: projects, error: projectsError }] =
    await Promise.all([
      supabase.from('project_statuses').select('id, is_done').in('id', statusIds),
      supabase.from('projects').select('id, workspace_id').in('id', projectIds)
    ]);

  if (statusesError) {
    throw statusesError;
  }

  if (projectsError) {
    throw projectsError;
  }

  const statusIsDoneById = new Map((statuses ?? []).map((status) => [status.id, status.is_done]));
  const workspaceIdByProjectId = new Map((projects ?? []).map((project) => [project.id, project.workspace_id]));

  const candidateRows: NotificationInsert[] = [];

  for (const task of dueCandidates) {
    if (!task.assignee_id || !task.due_at || task.completed_at) {
      continue;
    }

    if (statusIsDoneById.get(task.status_id)) {
      continue;
    }

    const workspaceId = workspaceIdByProjectId.get(task.project_id);
    if (!workspaceId) {
      continue;
    }

    const type = getDueNotificationType(task.due_at, now, dueSoonCutoff);
    if (!type) {
      continue;
    }

    candidateRows.push({
      workspace_id: workspaceId,
      user_id: task.assignee_id,
      type,
      entity_type: 'task',
      entity_id: task.id,
      payload_json: {
        taskId: task.id,
        dueAt: task.due_at
      } as Json,
      channel: 'in_app'
    });
  }

  if (!candidateRows.length) {
    return {
      scanned: dueCandidates.length,
      candidates: 0,
      created: 0,
      skipped: 0
    };
  }

  const uniqueTaskIds = [...new Set(candidateRows.map((row) => row.entity_id))];

  const { data: existingNotifications, error: existingError } = await supabase
    .from('notifications')
    .select('user_id, entity_id, type')
    .eq('entity_type', 'task')
    .in('type', ['due_soon', 'overdue'])
    .in('entity_id', uniqueTaskIds);

  if (existingError) {
    throw existingError;
  }

  const existingKeys = new Set(
    (existingNotifications ?? []).map((row) => `${row.user_id}:${row.entity_id}:${row.type}`)
  );
  const uniqueRows = new Map<string, (typeof candidateRows)[number]>();

  for (const row of candidateRows) {
    const key = `${row.user_id}:${row.entity_id}:${row.type}`;
    if (existingKeys.has(key) || uniqueRows.has(key)) {
      continue;
    }
    uniqueRows.set(key, row);
  }

  const rowsToInsert = [...uniqueRows.values()];

  if (rowsToInsert.length) {
    const { error: insertError } = await supabase.from('notifications').insert(rowsToInsert);
    if (insertError) {
      throw insertError;
    }
  }

  return {
    scanned: dueCandidates.length,
    candidates: candidateRows.length,
    created: rowsToInsert.length,
    skipped: candidateRows.length - rowsToInsert.length
  };
}
