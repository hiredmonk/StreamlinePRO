import { getServerEnv } from '@/lib/env';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';
import {
  getTaskActivity,
  getTaskAttachments,
  getTaskById,
  getSubtasks,
  getTaskComments,
  type TaskWithRelations
} from '@/lib/domain/tasks/queries';

export type TaskDrawerComment = {
  id: string;
  user_id: string;
  body: string;
  created_at: string;
};

export type TaskDrawerAttachment = {
  id: string;
  file_name: string;
  mime_type: string;
  size: number;
  created_at: string;
  uploaded_by: string;
  storage_path: string;
  signed_url?: string;
};

export type TaskDrawerActivity = {
  id: string;
  event_type: string;
  actor_id: string;
  created_at: string;
};

export type TaskDrawerData = {
  task: TaskWithRelations;
  subtasks: TaskWithRelations[];
  comments: TaskDrawerComment[];
  attachments: TaskDrawerAttachment[];
  activity: TaskDrawerActivity[];
};

export async function loadTaskDrawerData(
  supabase: AppSupabaseClient,
  taskId: string
): Promise<TaskDrawerData | null> {
  const task = await getTaskById(supabase, taskId);

  if (!task) {
    return null;
  }

  return loadTaskDrawerDataForTask(supabase, task);
}

export async function loadTaskDrawerDataForTask(
  supabase: AppSupabaseClient,
  task: TaskWithRelations
): Promise<TaskDrawerData> {
  const [subtasks, comments, attachments, activity] = await Promise.all([
    getSubtasks(supabase, task.id),
    getTaskComments(supabase, task.id),
    getTaskAttachments(supabase, task.id),
    getTaskActivity(supabase, task.id)
  ]);

  return {
    task,
    subtasks,
    comments,
    attachments: await signTaskAttachmentUrls(supabase, attachments),
    activity: activity.map((event) => ({
      id: event.id,
      event_type: event.event_type,
      actor_id: event.actor_id,
      created_at: event.created_at
    }))
  };
}

export async function signTaskAttachmentUrls(
  supabase: AppSupabaseClient,
  attachments: TaskDrawerAttachment[]
) {
  const env = getServerEnv();

  return Promise.all(
    attachments.map(async (attachment) => {
      const { data } = await supabase.storage
        .from(env.SUPABASE_STORAGE_BUCKET_ATTACHMENTS)
        .createSignedUrl(attachment.storage_path, 60 * 15);

      return {
        ...attachment,
        signed_url: data?.signedUrl
      };
    })
  );
}
