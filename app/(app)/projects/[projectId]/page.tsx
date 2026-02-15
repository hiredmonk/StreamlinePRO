import { notFound } from 'next/navigation';
import { EmptyState } from '@/app/components/ui/empty-state';
import { QuickAddForm } from '@/app/components/tasks/quick-add-form';
import { TaskRow } from '@/app/components/tasks/task-row';
import { TaskDrawerPanel } from '@/app/components/tasks/task-drawer-panel';
import { BoardView } from '@/app/components/projects/board-view';
import { requireUser } from '@/lib/auth';
import { getServerEnv } from '@/lib/env';
import {
  getProjectById,
  getProjectSections,
  getProjectStatuses
} from '@/lib/domain/projects/queries';
import {
  getProjectTasks,
  getTaskActivity,
  getTaskAttachments,
  getTaskById,
  getSubtasks,
  getTaskComments
} from '@/lib/domain/tasks/queries';

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ task?: string }>;
}) {
  const routeParams = await params;
  const query = await searchParams;

  const { supabase } = await requireUser();

  const project = await getProjectById(supabase, routeParams.projectId);

  if (!project) {
    notFound();
  }

  const [statuses, sections, tasks] = await Promise.all([
    getProjectStatuses(supabase, project.id),
    getProjectSections(supabase, project.id),
    getProjectTasks(supabase, project.id)
  ]);

  const selectedTaskCandidate = query.task ? await getTaskById(supabase, query.task) : null;
  const selectedTask =
    selectedTaskCandidate && selectedTaskCandidate.project_id === project.id
      ? selectedTaskCandidate
      : null;

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

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <section className="glass-panel p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#71695f]">Project</p>
          <h1 className="text-3xl font-semibold text-[#1f241f]" style={{ fontFamily: 'var(--font-display)' }}>
            {project.name}
          </h1>
          <p className="mt-1 text-sm text-[#585d58]">{project.description ?? 'No project description yet.'}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-[#d8ccb4] bg-[#fff8ea] px-2 py-1 text-[#645f53]">
              {project.taskCount} tasks
            </span>
            <span className="rounded-full border border-[#e1bbb5] bg-[#fff0ee] px-2 py-1 text-[#a13e33]">
              {project.overdueCount} overdue
            </span>
          </div>
        </section>

        <QuickAddForm
          projects={[
            {
              id: project.id,
              name: project.name
            }
          ]}
          preselectedProjectId={project.id}
        />

        {tasks.length ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#262b26]" style={{ fontFamily: 'var(--font-display)' }}>
              List View
            </h2>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                statuses={statuses.map((status) => ({ id: status.id, name: status.name }))}
                sections={sections.map((section) => ({ id: section.id, name: section.name }))}
                drawerHref={`/projects/${project.id}?task=${task.id}`}
              />
            ))}
          </section>
        ) : (
          <EmptyState
            title="No tasks yet"
            description="Use Quick Add above to create your first task in this project."
          />
        )}

        <BoardView
          projectId={project.id}
          statuses={statuses.map((status) => ({ id: status.id, name: status.name, color: status.color }))}
          tasks={tasks}
          drawerPathname={`/projects/${project.id}`}
        />
      </div>

      {selectedTask ? (
        <TaskDrawerPanel
          task={selectedTask}
          statuses={statuses.map((status) => ({ id: status.id, name: status.name }))}
          sections={sections.map((section) => ({ id: section.id, name: section.name }))}
          subtasks={subtasks}
          comments={comments}
          attachments={attachmentsWithUrls}
          activity={activity}
          closeHref={`/projects/${project.id}`}
        />
      ) : null}
    </div>
  );
}
