import { format } from 'date-fns';
import { EmptyState } from '@/app/components/ui/empty-state';
import { QuickAddForm } from '@/app/components/tasks/quick-add-form';
import { TaskRow } from '@/app/components/tasks/task-row';
import { TaskDrawerPanel } from '@/app/components/tasks/task-drawer-panel';
import { requireUser } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';
import { getProjectsForWorkspace, getWorkspacesForUser } from '@/lib/domain/projects/queries';
import {
  getMyTasks,
  getTaskActivity,
  getTaskAttachments,
  getTaskById,
  getSubtasks,
  getTaskComments
} from '@/lib/domain/tasks/queries';

export default async function MyTasksPage({
  searchParams
}: {
  searchParams: Promise<{ task?: string }>;
}) {
  const params = await searchParams;
  const selectedTaskId = params.task;
  const { user, supabase } = await requireUser();
  const workspaces = await getWorkspacesForUser(supabase, user.id);

  if (!workspaces.length) {
    return (
      <EmptyState
        title="No workspace yet"
        description="Create your first workspace in Projects to start planning work."
      />
    );
  }

  const activeWorkspace = workspaces[0];
  const projects = await getProjectsForWorkspace(supabase, activeWorkspace.id);
  const projectIds = projects.map((project) => project.id);

  const [statusRows, sectionRows] = await Promise.all([
    projectIds.length
      ? supabase
          .from('project_statuses')
          .select('id, project_id, name, color, is_done, sort_order')
          .in('project_id', projectIds)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    projectIds.length
      ? supabase
          .from('project_sections')
          .select('id, project_id, name, sort_order')
          .in('project_id', projectIds)
          .order('sort_order', { ascending: true })
      : Promise.resolve({ data: [], error: null })
  ]);

  if (statusRows.error) {
    throw statusRows.error;
  }

  if (sectionRows.error) {
    throw sectionRows.error;
  }

  const statusesByProject = new Map<string, Array<{ id: string; name: string; color: string }>>();
  (statusRows.data ?? []).forEach((status) => {
    const arr = statusesByProject.get(status.project_id) ?? [];
    arr.push({ id: status.id, name: status.name, color: status.color });
    statusesByProject.set(status.project_id, arr);
  });

  const sectionsByProject = new Map<string, Array<{ id: string; name: string }>>();
  (sectionRows.data ?? []).forEach((section) => {
    const arr = sectionsByProject.get(section.project_id) ?? [];
    arr.push({ id: section.id, name: section.name });
    sectionsByProject.set(section.project_id, arr);
  });

  const myTasks = await getMyTasks(supabase, user.id);

  const selectedTask = selectedTaskId ? await getTaskById(supabase, selectedTaskId) : null;
  const [subtasks, comments, attachments, activity] = selectedTask
    ? await Promise.all([
        getSubtasks(supabase, selectedTask.id),
        getTaskComments(supabase, selectedTask.id),
        getTaskAttachments(supabase, selectedTask.id),
        getTaskActivity(supabase, selectedTask.id)
      ])
    : [[], [], [], []];

  const env = getServerEnv();
  const attachmentsWithUrls = await Promise.all(
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

  const quickAddProjects = projects.map((project) => ({
    id: project.id,
    name: project.name
  }));

  const hasAnyTask =
    myTasks.today.length > 0 ||
    myTasks.overdue.length > 0 ||
    Object.values(myTasks.upcoming).some((tasks) => tasks.length > 0);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <QuickAddForm projects={quickAddProjects} />

        {!hasAnyTask ? (
          <EmptyState
            title="Your task lane is clear"
            description="Use Quick Add above to create your first task, or assign tasks from a project view."
          />
        ) : null}

        {myTasks.today.length ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#232724]" style={{ fontFamily: 'var(--font-display)' }}>
              Today
            </h2>
            {myTasks.today.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                statuses={statusesByProject.get(task.project_id) ?? []}
                sections={sectionsByProject.get(task.project_id) ?? []}
                drawerHref={`/my-tasks?task=${task.id}`}
              />
            ))}
          </section>
        ) : null}

        {myTasks.overdue.length ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#8f2f26]" style={{ fontFamily: 'var(--font-display)' }}>
              Overdue
            </h2>
            {myTasks.overdue.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                statuses={statusesByProject.get(task.project_id) ?? []}
                sections={sectionsByProject.get(task.project_id) ?? []}
                drawerHref={`/my-tasks?task=${task.id}`}
              />
            ))}
          </section>
        ) : null}

        {Object.entries(myTasks.upcoming).map(([dateKey, tasks]) => (
          <section key={dateKey} className="space-y-2">
            <h2 className="text-lg font-semibold text-[#2c322d]" style={{ fontFamily: 'var(--font-display)' }}>
              {format(new Date(dateKey), 'EEEE, MMM d')}
            </h2>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                statuses={statusesByProject.get(task.project_id) ?? []}
                sections={sectionsByProject.get(task.project_id) ?? []}
                drawerHref={`/my-tasks?task=${task.id}`}
              />
            ))}
          </section>
        ))}
      </div>

      {selectedTask ? (
        <TaskDrawerPanel
          task={selectedTask}
          statuses={statusesByProject.get(selectedTask.project_id) ?? []}
          sections={sectionsByProject.get(selectedTask.project_id) ?? []}
          subtasks={subtasks}
          comments={comments}
          attachments={attachmentsWithUrls}
          activity={activity}
          closeHref="/my-tasks"
        />
      ) : null}
    </div>
  );
}
