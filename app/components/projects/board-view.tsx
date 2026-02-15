'use client';

import { useMemo, useState, useTransition } from 'react';
import { moveTaskAction } from '@/lib/actions/task-actions';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';

type BoardViewProps = {
  projectId: string;
  statuses: Array<{ id: string; name: string; color: string }>;
  tasks: TaskWithRelations[];
  drawerPathname: string;
};

export function BoardView({ projectId, statuses, tasks, drawerPathname }: BoardViewProps) {
  const [items, setItems] = useState(tasks);
  const [isPending, startTransition] = useTransition();

  const groupedByStatus = useMemo(() => {
    return statuses.map((status) => ({
      ...status,
      items: items
        .filter((task) => task.status_id === status.id)
        .sort((a, b) => a.sort_order - b.sort_order)
    }));
  }, [statuses, items]);

  function onDrop(taskId: string, statusId: string) {
    const previous = items;
    const nextSortOrder = previous.filter((task) => task.status_id === statusId).length + 1;

    setItems((current) =>
      current.map((task) =>
        task.id === taskId
          ? {
              ...task,
              status_id: statusId,
              status: {
                ...task.status,
                id: statusId,
                name: statuses.find((status) => status.id === statusId)?.name ?? task.status.name
              },
              sort_order: nextSortOrder
            }
          : task
      )
    );

    startTransition(async () => {
      const result = await moveTaskAction({
        id: taskId,
        statusId,
        sortOrder: nextSortOrder
      });

      if (!result.ok) {
        setItems(previous);
      }
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[#232724]" style={{ fontFamily: 'var(--font-display)' }}>
          Board View
        </h3>
        <p className="text-xs uppercase tracking-[0.16em] text-[#6b6c67]">
          {projectId.slice(0, 8)} {isPending ? '· syncing' : ''}
        </p>
      </div>
      <div className="grid gap-3 lg:grid-cols-4">
        {groupedByStatus.map((column) => (
          <div
            key={column.id}
            className="rounded-2xl border border-[#d9cfb9] bg-[#fff9ef] p-3"
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const taskId = event.dataTransfer.getData('text/task-id');
              if (taskId) {
                onDrop(taskId, column.id);
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
    </section>
  );
}
