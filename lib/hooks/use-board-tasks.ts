'use client';

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import { moveTaskWithConcurrencyAction } from '@/lib/actions/task-actions';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';

type BoardStatus = {
  id: string;
  name: string;
  color: string;
  laneVersion?: number;
};

type MoveTaskMutation = (input: {
  id: string;
  statusId: string;
}) => Promise<{ ok: boolean; data?: { sortOrder: number } }>;

export type UseBoardTasksResult = {
  columns: Array<BoardStatus & { items: TaskWithRelations[] }>;
  isPending: boolean;
  moveTask: (taskId: string, statusId: string, targetIndex?: number) => Promise<void>;
  laneVersions: Record<string, number>;
  boardMessage: string | null;
  clearBoardMessage: () => void;
};

export function useBoardTasks({
  tasks,
  statuses,
  moveTask,
  projectId
}: {
  tasks: TaskWithRelations[];
  statuses: BoardStatus[];
  moveTask: MoveTaskMutation;
  projectId?: string;
}): UseBoardTasksResult {
  const [items, setItems] = useState(tasks);
  const [isPending, startTransition] = useTransition();
  const [boardMessage, setBoardMessage] = useState<string | null>(null);

  const [laneVersions, setLaneVersions] = useState<Record<string, number>>(() => {
    const versions: Record<string, number> = {};
    for (const status of statuses) {
      if (status.laneVersion !== undefined) {
        versions[status.id] = status.laneVersion;
      }
    }
    return versions;
  });

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  useEffect(() => {
    const versions: Record<string, number> = {};
    for (const status of statuses) {
      if (status.laneVersion !== undefined) {
        versions[status.id] = status.laneVersion;
      }
    }
    if (Object.keys(versions).length > 0) {
      setLaneVersions(versions);
    }
  }, [statuses]);

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

  const hasConcurrency = Object.keys(laneVersions).length > 0 && projectId;

  const clearBoardMessage = useCallback(() => setBoardMessage(null), []);

  function moveTaskItem(taskId: string, statusId: string, targetIndex?: number) {
    return new Promise<void>((resolve) => {
      const previous = items;
      const taskToMove = items.find((task) => task.id === taskId);
      const fromStatusId = taskToMove?.status_id;

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
          if (hasConcurrency && fromStatusId) {
            const expectedVersion = laneVersions[statusId] ?? 0;
            const laneItems = previous.filter((t) => t.status_id === statusId);
            const effectiveTargetIndex = targetIndex ?? laneItems.length;

            const result = await moveTaskWithConcurrencyAction({
              taskId,
              projectId,
              fromStatusId,
              toStatusId: statusId,
              targetIndex: effectiveTargetIndex,
              expectedLaneVersion: expectedVersion
            });

            if (!result.ok) {
              setItems(previous);
              setBoardMessage(result.error);
            } else if (result.data.conflict) {
              setItems(previous);
              setBoardMessage(`Board conflict: ${result.data.conflict.reason}. Please refresh.`);
            } else {
              // Issue 2 fix: update BOTH destination and source lane versions
              setLaneVersions((current) => {
                const next = { ...current, [statusId]: result.data.laneVersion };
                if (result.data.sourceStatusId !== undefined && result.data.sourceLaneVersion !== undefined) {
                  next[result.data.sourceStatusId] = result.data.sourceLaneVersion;
                }
                return next;
              });

              if (result.data.sortOrder !== undefined) {
                setItems((current) =>
                  current.map((task) =>
                    task.id === taskId
                      ? { ...task, sort_order: result.data.sortOrder }
                      : task
                  )
                );
              }
            }

            resolve();
            return;
          }

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
    moveTask: moveTaskItem,
    laneVersions,
    boardMessage,
    clearBoardMessage
  };
}
