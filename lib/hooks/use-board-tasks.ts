'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';

type BoardStatus = {
  id: string;
  name: string;
  color: string;
};

type MoveTaskMutation = (input: {
  id: string;
  statusId: string;
}) => Promise<{ ok: boolean; data?: { sortOrder: number } }>;

export type UseBoardTasksResult = {
  columns: Array<BoardStatus & { items: TaskWithRelations[] }>;
  isPending: boolean;
  moveTask: (taskId: string, statusId: string) => Promise<void>;
};

export function useBoardTasks({
  tasks,
  statuses,
  moveTask
}: {
  tasks: TaskWithRelations[];
  statuses: BoardStatus[];
  moveTask: MoveTaskMutation;
}): UseBoardTasksResult {
  const [items, setItems] = useState(tasks);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  const columns = useMemo(
    () =>
      statuses.map((status) => ({
        ...status,
        items: items
          .filter((task) => task.status_id === status.id)
          .sort((a, b) => a.sort_order - b.sort_order)
      })),
    [items, statuses]
  );

  function moveTaskItem(taskId: string, statusId: string) {
    return new Promise<void>((resolve) => {
      const previous = items;
      const nextSortOrder =
        previous
          .filter((task) => task.status_id === statusId)
          .reduce((max, task) => Math.max(max, task.sort_order), 0) + 1;
      const nextStatus = statuses.find((status) => status.id === statusId);

      setItems((current) =>
        current.map((task) =>
          task.id === taskId
            ? {
                ...task,
                status_id: statusId,
                status: {
                  ...task.status,
                  id: statusId,
                  name: nextStatus?.name ?? task.status.name,
                  color: nextStatus?.color ?? task.status.color
                },
                sort_order: nextSortOrder
              }
            : task
        )
      );

      startTransition(() => {
        void (async () => {
          const result = await moveTask({
            id: taskId,
            statusId
          });

          if (!result.ok) {
            setItems(previous);
          } else if (result.data?.sortOrder !== undefined) {
            setItems((current) =>
              current.map((task) =>
                task.id === taskId
                  ? {
                      ...task,
                      sort_order: result.data?.sortOrder ?? task.sort_order
                    }
                  : task
              )
            );
          }

          resolve();
        })();
      });
    });
  }

  return {
    columns,
    isPending,
    moveTask: moveTaskItem
  };
}
