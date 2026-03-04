'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { moveTaskWithConcurrencyAction } from '@/lib/actions/task-actions';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';

type BoardViewProps = {
  projectId: string;
  actorUserId: string;
  statuses: Array<{ id: string; name: string; color: string; laneVersion: number }>;
  tasks: TaskWithRelations[];
  drawerPathname: string;
};

export function BoardView({
  projectId,
  actorUserId,
  statuses,
  tasks,
  drawerPathname
}: BoardViewProps) {
  const [items, setItems] = useState(tasks);
  const [laneVersions, setLaneVersions] = useState<Record<string, number>>(() =>
    buildLaneVersionMap(statuses)
  );
  const [boardMessage, setBoardMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setItems(tasks);
  }, [tasks]);

  useEffect(() => {
    setLaneVersions(buildLaneVersionMap(statuses));
  }, [statuses]);

  const groupedByStatus = useMemo(() => {
    return statuses.map((status) => ({
      ...status,
      items: items
        .filter((task) => task.status_id === status.id)
        .sort((a, b) => a.sort_order - b.sort_order)
    }));
  }, [statuses, items]);

  function onDrop(taskId: string, statusId: string) {
    const previousItems = items;
    const previousLaneVersions = laneVersions;
    const movingTask = previousItems.find((task) => task.id === taskId);

    if (!movingTask) {
      return;
    }

    const targetIndex = previousItems.filter(
      (task) => task.status_id === statusId && task.id !== taskId
    ).length;
    const expectedLaneVersion = laneVersions[statusId] ?? 0;
    const nextItems = applyOptimisticMove(previousItems, {
      taskId,
      toStatusId: statusId,
      targetIndex,
      statuses
    });

    setItems(nextItems);
    setBoardMessage(null);

    startTransition(async () => {
      const result = await moveTaskWithConcurrencyAction({
        taskId,
        projectId,
        fromStatusId: movingTask.status_id,
        toStatusId: statusId,
        toSectionId: movingTask.section_id,
        targetIndex,
        expectedLaneVersion,
        actorUserId
      });

      if (!result.ok) {
        setItems(previousItems);
        setLaneVersions(previousLaneVersions);
        setBoardMessage('Board update failed. Please retry.');
        return;
      }

      if (result.data.conflict) {
        setItems(previousItems);
        setLaneVersions(previousLaneVersions);
        setBoardMessage(getConflictMessage(result.data.conflict.reason));
        return;
      }

      setLaneVersions((current) => ({
        ...current,
        [result.data.statusId]: result.data.laneVersion
      }));
    });
  }

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
      {boardMessage ? (
        <p className="rounded-xl border border-[#f0c2bc] bg-[#fff4f2] px-3 py-2 text-xs text-[#9f3127]">
          {boardMessage}
        </p>
      ) : null}
      <div className="overflow-x-auto pb-1">
        <div
          className="grid min-w-max gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.max(statuses.length, 1)}, minmax(220px, 1fr))` }}
        >
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
      </div>
    </section>
  );
}

function buildLaneVersionMap(
  statuses: Array<{ id: string; laneVersion: number }>
): Record<string, number> {
  return statuses.reduce<Record<string, number>>((accumulator, status) => {
    accumulator[status.id] = status.laneVersion;
    return accumulator;
  }, {});
}

function applyOptimisticMove(
  items: TaskWithRelations[],
  input: {
    taskId: string;
    toStatusId: string;
    targetIndex: number;
    statuses: Array<{ id: string; name: string }>;
  }
) {
  const movingTask = items.find((task) => task.id === input.taskId);
  if (!movingTask) {
    return items;
  }

  const sourceStatusId = movingTask.status_id;
  const destinationIds = items
    .filter((task) => task.status_id === input.toStatusId && task.id !== input.taskId)
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((task) => task.id);
  const clampedTargetIndex = Math.min(Math.max(input.targetIndex, 0), destinationIds.length);
  destinationIds.splice(clampedTargetIndex, 0, input.taskId);

  const sourceIds =
    sourceStatusId === input.toStatusId
      ? destinationIds
      : items
          .filter((task) => task.status_id === sourceStatusId && task.id !== input.taskId)
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((task) => task.id);

  const destinationOrder = new Map(destinationIds.map((taskId, index) => [taskId, index + 1]));
  const sourceOrder = new Map(sourceIds.map((taskId, index) => [taskId, index + 1]));

  return items.map((task) => {
    if (task.id === input.taskId) {
      return {
        ...task,
        status_id: input.toStatusId,
        status: {
          ...task.status,
          id: input.toStatusId,
          name: input.statuses.find((status) => status.id === input.toStatusId)?.name ?? task.status.name
        },
        sort_order: destinationOrder.get(task.id) ?? task.sort_order
      };
    }

    if (destinationOrder.has(task.id)) {
      return {
        ...task,
        sort_order: destinationOrder.get(task.id) ?? task.sort_order
      };
    }

    if (sourceStatusId !== input.toStatusId && sourceOrder.has(task.id)) {
      return {
        ...task,
        sort_order: sourceOrder.get(task.id) ?? task.sort_order
      };
    }

    return task;
  });
}

function getConflictMessage(reason: string) {
  if (reason === 'version_mismatch') {
    return 'Board changed in another session. Refresh and try again.';
  }

  if (reason === 'duplicate_sort_order') {
    return 'Lane order is inconsistent. Refresh and try again.';
  }

  if (reason === 'missing_task') {
    return 'Task moved elsewhere before your update. Refresh and retry.';
  }

  if (reason === 'invalid_lane') {
    return 'Target lane is no longer valid. Refresh and retry.';
  }

  return 'Board update conflict. Refresh and retry.';
}
