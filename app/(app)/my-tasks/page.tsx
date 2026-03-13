import { format } from 'date-fns';
import { EmptyState } from '@/app/components/ui/empty-state';
import { MyTasksFilters } from '@/app/components/tasks/my-tasks-filters';
import { QuickAddForm } from '@/app/components/tasks/quick-add-form';
import { TaskRow } from '@/app/components/tasks/task-row';
import { TaskDrawerPanel } from '@/app/components/tasks/task-drawer-panel';
import { loadMyTasksPageData, type MyTasksSearch } from '@/lib/page-loaders/my-tasks-page';

export default async function MyTasksPage({
  searchParams
}: {
  searchParams: Promise<MyTasksSearch>;
}) {
  const params = await searchParams;
  const pageData = await loadMyTasksPageData(params);

  if (pageData.mode === 'no-workspaces') {
    return (
      <EmptyState
        title="No workspace yet"
        description="Create your first workspace in Projects to start planning work."
      />
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-4">
        <MyTasksFilters filters={pageData.filterState} />

        {pageData.quickAddProjects.length ? (
          <QuickAddForm
            projects={pageData.quickAddProjects}
            assigneesByProject={pageData.assigneesByProject}
            currentUserId={pageData.currentUserId}
            defaultAssigneeMode="self-when-allowed"
            preselectedProjectId={pageData.filterState.selectedProjectId ?? undefined}
          />
        ) : (
          <EmptyState
            title="No projects in this workspace"
            description="Open Projects to create one before adding work here."
          />
        )}

        {!pageData.hasAnyTask ? (
          <EmptyState
            title="Your task lane is clear"
            description="Use Quick Add above to create your first task, or assign tasks from a project view."
          />
        ) : null}

        {pageData.groups.today.length ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#232724]" style={{ fontFamily: 'var(--font-display)' }}>
              Today
            </h2>
            {pageData.groups.today.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                statuses={pageData.statusesByProject[task.project_id] ?? []}
                sections={pageData.sectionsByProject[task.project_id] ?? []}
                assignees={pageData.assigneesByProject[task.project_id] ?? []}
                drawerHref={buildMyTasksHref(params, {
                  task: task.id
                })}
                completionReturnTo={buildMyTasksHref(params, {
                  task: task.id,
                  completed: '1'
                })}
              />
            ))}
          </section>
        ) : null}

        {pageData.groups.overdue.length ? (
          <section className="space-y-2">
            <h2 className="text-lg font-semibold text-[#8f2f26]" style={{ fontFamily: 'var(--font-display)' }}>
              Overdue
            </h2>
            {pageData.groups.overdue.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                statuses={pageData.statusesByProject[task.project_id] ?? []}
                sections={pageData.sectionsByProject[task.project_id] ?? []}
                assignees={pageData.assigneesByProject[task.project_id] ?? []}
                drawerHref={buildMyTasksHref(params, {
                  task: task.id
                })}
                completionReturnTo={buildMyTasksHref(params, {
                  task: task.id,
                  completed: '1'
                })}
              />
            ))}
          </section>
        ) : null}

        {Object.entries(pageData.groups.upcoming).map(([dateKey, tasks]) => (
          <section key={dateKey} className="space-y-2">
            <h2 className="text-lg font-semibold text-[#2c322d]" style={{ fontFamily: 'var(--font-display)' }}>
              {format(new Date(dateKey), 'EEEE, MMM d')}
            </h2>
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                statuses={pageData.statusesByProject[task.project_id] ?? []}
                sections={pageData.sectionsByProject[task.project_id] ?? []}
                assignees={pageData.assigneesByProject[task.project_id] ?? []}
                drawerHref={buildMyTasksHref(params, {
                  task: task.id
                })}
                completionReturnTo={buildMyTasksHref(params, {
                  task: task.id,
                  completed: '1'
                })}
              />
            ))}
          </section>
        ))}
      </div>

      {pageData.selectedTaskPanel ? (
        <TaskDrawerPanel
          task={pageData.selectedTaskPanel.task}
          statuses={pageData.statusesByProject[pageData.selectedTaskPanel.task.project_id] ?? []}
          sections={pageData.sectionsByProject[pageData.selectedTaskPanel.task.project_id] ?? []}
          assignees={pageData.assigneesByProject[pageData.selectedTaskPanel.task.project_id] ?? []}
          subtasks={pageData.selectedTaskPanel.subtasks}
          comments={pageData.selectedTaskPanel.comments}
          attachments={pageData.selectedTaskPanel.attachments}
          activity={pageData.selectedTaskPanel.activity}
          completionReturnTo={buildMyTasksHref(params, {
            task: pageData.selectedTaskPanel.task.id,
            completed: '1'
          })}
          closeHref={buildMyTasksHref(params, {
            task: null,
            completed: null,
            recurring: null
          })}
          mode={pageData.selectedTaskMode}
          recurringNotice={pageData.recurringNotice}
        />
      ) : null}
    </div>
  );
}

function buildMyTasksHref(
  current: MyTasksSearch,
  overrides: Partial<Record<keyof MyTasksSearch, string | null>>
) {
  const next = new URLSearchParams();
  const baseEntries: Array<[keyof MyTasksSearch, string | undefined]> = [
    ['workspace', current.workspace],
    ['project', current.project],
    ['status', current.status],
    ['quick', current.quick],
    ['task', current.task]
  ];

  baseEntries.forEach(([key, value]) => {
    const override = overrides[key];
    const finalValue = override === undefined ? value : override;
    if (finalValue) {
      next.set(key, finalValue);
    }
  });

  const completionEntries: Array<[keyof MyTasksSearch, string | null | undefined]> = [
    ['completed', overrides.completed],
    ['recurring', overrides.recurring]
  ];

  completionEntries.forEach(([key, value]) => {
    if (value) {
      next.set(key, value);
    }
  });

  const query = next.toString();
  return query ? `/my-tasks?${query}` : '/my-tasks';
}
