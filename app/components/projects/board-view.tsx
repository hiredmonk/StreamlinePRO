'use client';

import { moveTaskAction } from '@/lib/actions/task-actions';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';
import { useBoardTasks } from '@/lib/hooks/use-board-tasks';

type BoardViewProps = {
  projectId: string;
  statuses: Array<{ id: string; name: string; color: string }>;
  tasks: TaskWithRelations[];
  drawerPathname: string;
};

export function BoardView({ projectId, statuses, tasks, drawerPathname }: BoardViewProps) {
  const { columns, isPending, moveTask } = useBoardTasks({
    tasks,
    statuses,
    moveTask: moveTaskAction
  });

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#232724]" style={{ fontFamily: 'var(--font-display)' }}>
          Board View
        </h3>
        <p className="text-xs uppercase tracking-[0.16em] text-[#6b6c67]">
          Manage columns in Workflow settings ·{' '}
          {projectId.slice(0, 8)} {isPending ? '· syncing' : ''}
        </p>
      </div>
      <div className="overflow-x-auto pb-1">
        <div
          className="grid min-w-max gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.max(statuses.length, 1)}, minmax(220px, 1fr))` }}
        >
        {columns.map((column) => (
          <div
            key={column.id}
            className="rounded-2xl border border-[#d9cfb9] bg-[#fff9ef] p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const taskId = event.dataTransfer.getData('text/task-id');
              if (taskId) {
                void moveTask(taskId, column.id);
              }
            }}
          >
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold" style={{ color: column.color }}>
                {column.name}
              </p>
              <span className="rounded-full border border-[#d2c7b0] bg-white px-2 py-0.5 text-xs text-[#5d625d]">
                {column.items.length}
              </span>
            </div>

            <ul className="space-y-2">
              {column.items.map((task) => (
                <li
                  key={task.id}
                  draggable
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/task-id', task.id);
                  }}
                  className="cursor-grab rounded-xl border border-[#dfd3bc] bg-white p-3 active:cursor-grabbing"
                >
                  <a
                    href={`${drawerPathname}?task=${task.id}`}
                    className="line-clamp-2 text-sm font-semibold text-[#2b312d] hover:text-[#af3324]"
                  >
                    {task.title}
                  </a>
                  <p className="mt-2 text-[11px] uppercase tracking-wide text-[#7a7d77]">
                    {task.section?.name ?? 'No section'}
                  </p>
                </li>
              ))}
              {!column.items.length ? (
                <li className="rounded-lg border border-dashed border-[#d6cbb3] p-3 text-xs text-[#80827e]">
                  Drop tasks here
                </li>
              ) : null}
            </ul>
          </div>
        ))}
        </div>
      </div>
    </section>
  );
}
