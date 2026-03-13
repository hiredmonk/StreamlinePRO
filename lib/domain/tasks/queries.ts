import {
  addDays,
  endOfDay,
  format,
  isSameDay,
  isWithinInterval,
  startOfDay
} from 'date-fns';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';

export type TaskWithRelations = {
  id: string;
  project_id: string;
  section_id: string | null;
  status_id: string;
  title: string;
  description: string | null;
  assignee_id: string | null;
  creator_id: string;
  due_at: string | null;
  due_timezone: string | null;
  priority: 'low' | 'medium' | 'high' | null;
  parent_task_id: string | null;
  recurrence_id: string | null;
  is_today: boolean;
  sort_order: number;
  completed_at: string | null;
  project: {
    id: string;
    name: string;
  };
  status: {
    id: string;
    name: string;
    color: string;
    is_done: boolean;
  };
  section: {
    id: string;
    name: string;
  } | null;
};

export type MyTasksGroups = {
  today: TaskWithRelations[];
  upcoming: Record<string, TaskWithRelations[]>;
  overdue: TaskWithRelations[];
};

export type MyTasksQuickFilter = 'waiting' | 'due-this-week' | 'unassigned';

export type GetMyTasksInput = {
  userId: string;
  projectIds: string[];
  projectId?: string | null;
  statusIds?: string[];
  quickFilter?: MyTasksQuickFilter | null;
};

export async function getProjectTasks(
  supabase: AppSupabaseClient,
  projectId: string
): Promise<TaskWithRelations[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      project_id,
      section_id,
      status_id,
      title,
      description,
      assignee_id,
      creator_id,
      due_at,
      due_timezone,
      priority,
      parent_task_id,
      recurrence_id,
      is_today,
      sort_order,
      completed_at,
      project:projects!tasks_project_id_fkey (
        id,
        name
      ),
      status:project_statuses!tasks_status_id_fkey (
        id,
        name,
        color,
        is_done
      ),
      section:project_sections!tasks_section_id_fkey (
        id,
        name
      )
    `
    )
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return normalizeTaskRows(data ?? []);
}

export async function getMyTasks(
  supabase: AppSupabaseClient,
  input: GetMyTasksInput
): Promise<MyTasksGroups> {
  const projectIds = input.projectId ? [input.projectId] : input.projectIds;
  if (!projectIds.length) {
    return {
      today: [],
      upcoming: {},
      overdue: []
    };
  }

  const taskQuery = supabase
    .from('tasks')
    .select(
      `
      id,
      project_id,
      section_id,
      status_id,
      title,
      description,
      assignee_id,
      creator_id,
      due_at,
      due_timezone,
      priority,
      parent_task_id,
      recurrence_id,
      is_today,
      sort_order,
      completed_at,
      project:projects!tasks_project_id_fkey (
        id,
        name
      ),
      status:project_statuses!tasks_status_id_fkey (
        id,
        name,
        color,
        is_done
      ),
      section:project_sections!tasks_section_id_fkey (
        id,
        name
      )
    `
    )
    .in('project_id', projectIds)
    .is('parent_task_id', null)
    .order('due_at', { ascending: true, nullsFirst: false });

  if (input.quickFilter === 'unassigned') {
    taskQuery.is('assignee_id', null);
  } else {
    taskQuery.eq('assignee_id', input.userId);
  }

  const { data, error } = await taskQuery;

  if (error) {
    throw error;
  }

  const today = startOfDay(new Date());
  const twoWeeks = endOfDay(addDays(today, 14));
  const normalized = normalizeTaskRows(data ?? [])
    .filter((task) => !task.completed_at)
    .filter((task) => !input.statusIds?.length || input.statusIds.includes(task.status_id));

  const grouped: MyTasksGroups = {
    today: [],
    upcoming: {},
    overdue: []
  };

  normalized.forEach((task) => {
    if (!task.due_at) {
      if (input.quickFilter === 'due-this-week') {
        return;
      }

      if (task.is_today) {
        grouped.today.push(task);
      }

      return;
    }

    const dueDate = new Date(task.due_at);

    if (dueDate < today) {
      grouped.overdue.push(task);
      return;
    }

    if (task.is_today || isSameDay(dueDate, today)) {
      grouped.today.push(task);
      return;
    }

    if (input.quickFilter === 'due-this-week') {
      const endOfWeekWindow = endOfDay(addDays(today, 7));
      if (!isWithinInterval(dueDate, { start: today, end: endOfWeekWindow })) {
        return;
      }
    }

    if (isWithinInterval(dueDate, { start: today, end: twoWeeks })) {
      const key = format(dueDate, 'yyyy-MM-dd');
      grouped.upcoming[key] ??= [];
      grouped.upcoming[key].push(task);
    }
  });

  return grouped;
}

export async function getTaskById(
  supabase: AppSupabaseClient,
  taskId: string
): Promise<TaskWithRelations | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      project_id,
      section_id,
      status_id,
      title,
      description,
      assignee_id,
      creator_id,
      due_at,
      due_timezone,
      priority,
      parent_task_id,
      recurrence_id,
      is_today,
      sort_order,
      completed_at,
      project:projects!tasks_project_id_fkey (
        id,
        name
      ),
      status:project_statuses!tasks_status_id_fkey (
        id,
        name,
        color,
        is_done
      ),
      section:project_sections!tasks_section_id_fkey (
        id,
        name
      )
    `
    )
    .eq('id', taskId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return normalizeTaskRows([data])[0] ?? null;
}

export async function getSubtasks(
  supabase: AppSupabaseClient,
  parentTaskId: string
): Promise<TaskWithRelations[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(
      `
      id,
      project_id,
      section_id,
      status_id,
      title,
      description,
      assignee_id,
      creator_id,
      due_at,
      due_timezone,
      priority,
      parent_task_id,
      recurrence_id,
      is_today,
      sort_order,
      completed_at,
      project:projects!tasks_project_id_fkey (
        id,
        name
      ),
      status:project_statuses!tasks_status_id_fkey (
        id,
        name,
        color,
        is_done
      ),
      section:project_sections!tasks_section_id_fkey (
        id,
        name
      )
    `
    )
    .eq('parent_task_id', parentTaskId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return normalizeTaskRows(data ?? []);
}

export async function getTaskComments(
  supabase: AppSupabaseClient,
  taskId: string
) {
  const { data, error } = await supabase
    .from('task_comments')
    .select('id, task_id, user_id, body, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getTaskAttachments(
  supabase: AppSupabaseClient,
  taskId: string
) {
  const { data, error } = await supabase
    .from('task_attachments')
    .select('id, file_name, mime_type, size, created_at, uploaded_by, storage_path')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getTaskActivity(
  supabase: AppSupabaseClient,
  taskId: string
) {
  const { data, error } = await supabase
    .from('task_activity')
    .select('id, event_type, payload_json, actor_id, created_at')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

function normalizeTaskRows(data: unknown[]): TaskWithRelations[] {
  return data.map((row) => {
    const record = row as Record<string, any>;

    return {
      id: record.id,
      project_id: record.project_id,
      section_id: record.section_id,
      status_id: record.status_id,
      title: record.title,
      description: record.description,
      assignee_id: record.assignee_id,
      creator_id: record.creator_id,
      due_at: record.due_at,
      due_timezone: record.due_timezone,
      priority: record.priority,
      parent_task_id: record.parent_task_id,
      recurrence_id: record.recurrence_id,
      is_today: record.is_today,
      sort_order: record.sort_order,
      completed_at: record.completed_at,
      project: Array.isArray(record.project) ? record.project[0] : record.project,
      status: Array.isArray(record.status) ? record.status[0] : record.status,
      section: record.section ? (Array.isArray(record.section) ? record.section[0] : record.section) : null
    };
  });
}
