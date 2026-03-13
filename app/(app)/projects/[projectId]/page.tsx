import { notFound } from 'next/navigation';
import { EmptyState } from '@/app/components/ui/empty-state';
import { QuickAddForm } from '@/app/components/tasks/quick-add-form';
import { TaskRow } from '@/app/components/tasks/task-row';
import { TaskDrawerPanel } from '@/app/components/tasks/task-drawer-panel';
import { BoardView } from '@/app/components/projects/board-view';
import { ProjectSetupGuidePanel } from '@/app/components/projects/project-setup-guide';
import { WorkflowStatusManager } from '@/app/components/projects/workflow-status-manager';
import { loadProjectDetailPageData } from '@/lib/page-loaders/project-detail-page';

export default async function ProjectDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ task?: string; completed?: string; recurring?: string }>;
}) {
  const routeParams = await params;
  const query = await searchParams;
  const pageData = await loadProjectDetailPageData(routeParams.projectId, query);

  if (!pageData) {
    notFound();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <section className="glass-panel p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-[#71695f]">Project</p>
          <h1 className="text-3xl font-semibold text-[#1f241f]" style={{ fontFamily: 'var(--font-display)' }}>
            {pageData.project.name}
          </h1>
          <p className="mt-1 text-sm text-[#585d58]">{pageData.project.description ?? 'No project description yet.'}</p>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-[#d8ccb4] bg-[#fff8ea] px-2 py-1 text-[#645f53]">
              {pageData.project.taskCount} tasks
            </span>
            <span className="rounded-full border border-[#e1bbb5] bg-[#fff0ee] px-2 py-1 text-[#a13e33]">
              {pageData.project.overdueCount} overdue
            </span>
          </div>
        </section>

        {pageData.setupGuide ? <ProjectSetupGuidePanel guide={pageData.setupGuide} /> : null}

        <QuickAddForm
          id="quick-add-form"
          projects={[
            {
              id: pageData.project.id,
              name: pageData.project.name
            }
          ]}
          assigneesByProject={{ [pageData.project.id]: pageData.assignees }}
          preselectedProjectId={pageData.project.id}
          projectLocked
        />

        <WorkflowStatusManager
          id="workflow-status-manager"
          projectId={pageData.project.id}
          statuses={pageData.workflowOptions.managerStatuses}
        />

        {pageData.tasks.length ? (
          <section className="space-y-2">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold text-[#262b26]" style={{ fontFamily: 'var(--font-display)' }}>
                  List View
                </h2>
                <p className="text-sm text-[#686c67]">
                  Managers can assign owners directly from rows, board cards, or the task drawer.
                </p>
              </div>
            </div>
            {pageData.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                statuses={pageData.workflowOptions.taskStatuses}
                sections={pageData.workflowOptions.taskSections}
                assignees={pageData.assignees}
                drawerHref={`/projects/${pageData.project.id}?task=${task.id}`}
                completionReturnTo={`/projects/${pageData.project.id}?task=${task.id}&completed=1`}
              />
            ))}
          </section>
        ) : (
          <EmptyState
            title="No tasks yet"
            description="Use the setup guide above to review the workflow and create the first task in this project."
          />
        )}

        <BoardView
          projectId={pageData.project.id}
          statuses={pageData.workflowOptions.boardStatuses}
          tasks={pageData.tasks}
          assignees={pageData.assignees}
          drawerPathname={`/projects/${pageData.project.id}`}
        />
      </div>

      {pageData.selectedTaskPanel ? (
        <TaskDrawerPanel
          task={pageData.selectedTaskPanel.task}
          statuses={pageData.workflowOptions.taskStatuses}
          sections={pageData.workflowOptions.taskSections}
          assignees={pageData.assignees}
          subtasks={pageData.selectedTaskPanel.subtasks}
          comments={pageData.selectedTaskPanel.comments}
          attachments={pageData.selectedTaskPanel.attachments}
          activity={pageData.selectedTaskPanel.activity}
          closeHref={`/projects/${pageData.project.id}`}
          completionReturnTo={`/projects/${pageData.project.id}?task=${pageData.selectedTaskPanel.task.id}&completed=1`}
          mode={pageData.selectedTaskMode}
          recurringNotice={pageData.recurringNotice}
        />
      ) : null}
    </div>
  );
}
