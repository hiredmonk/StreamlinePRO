'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { moveTaskAction, updateTaskAction } from '@/lib/actions/task-actions';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';
import { useBoardTasks } from '@/lib/hooks/use-board-tasks';

type BoardViewProps = {
  projectId: string;
  statuses: Array<{ id: string; name: string; color: string }>;
  tasks: TaskWithRelations[];
  assignees: Array<{
    userId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    initials: string;
  }>;
  drawerPathname: string;
};

export function BoardView({
  projectId,
  statuses,
  tasks,
  assignees,
  drawerPathname
}: BoardViewProps) {
  const { columns, isPending, moveTask } = useBoardTasks({
    tasks,
    statuses,
    moveTask: moveTaskAction
  });
  const router = useRouter();
  const [assigneeOverrides, setAssigneeOverrides] = useState<Record<string, string>>({});
  const [isAssigneePending, startAssigneeTransition] = useTransition();

  useEffect(() => {
    setAssigneeOverrides({});
  }, [tasks]);

  function getAssignee(task: TaskWithRelations) {
    return assignees.find((assignee) => assignee.userId === task.assignee_id) ?? null;
  }

  function saveAssignee(taskId: string, previousAssigneeId: string | null, nextAssigneeId: string | null) {
    setAssigneeOverrides((current) => ({
      ...current,
      [taskId]: nextAssigneeId ?? ''
    }));

    startAssigneeTransition(() => {
      void (async () => {
        const result = await updateTaskAction({
          id: taskId,
          assigneeId: nextAssigneeId
        });

        if (!result.ok) {
          setAssigneeOverrides((current) => ({
            ...current,
            [taskId]: previousAssigneeId ?? ''
          }));
          return;
        }

        router.refresh();
      })();
    });
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[#232724]" style={{ fontFamily: 'var(--font-display)' }}>
            Board View
          </h3>
          <p className="text-sm text-[#686c67]">Reassign ownership from any card without leaving the board.</p>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-[#6b6c67]">
          Manage columns in Workflow settings | {projectId.slice(0, 8)}{' '}
          {isPending || isAssigneePending ? '| syncing' : ''}
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
                {column.items.map((task) => {
                  const currentAssignee = getAssignee(task);
                  const hasFormerAssignee = Boolean(task.assignee_id && !currentAssignee);

                  return (
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
                      <div className="mt-3 flex items-center gap-2 text-xs text-[#5e625e]">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#d8ccb4] bg-[#f8ecd4] text-[11px] font-semibold text-[#5f513d]">
                          {currentAssignee?.initials ?? (hasFormerAssignee ? 'FM' : 'UN')}
                        </span>
                        <span className="truncate">
                          {currentAssignee?.displayName ?? (hasFormerAssignee ? 'Former member' : 'Unassigned')}
                        </span>
                      </div>
                      <label className="mt-3 grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b6f69]">
                        Owner
                        <select
                          aria-label={`Assignee for ${task.title}`}
                          value={assigneeOverrides[task.id] ?? task.assignee_id ?? ''}
                          onChange={(event) =>
                            saveAssignee(task.id, task.assignee_id, event.currentTarget.value || null)
                          }
                          className="h-9 w-full rounded-lg border border-[#d8ceb6] bg-[#fffdf8] px-3 text-sm font-normal normal-case tracking-normal text-[#2d332e]"
                        >
                          <option value="">Unassigned</option>
                          {hasFormerAssignee ? (
                            <option value={task.assignee_id ?? ''}>Former member</option>
                          ) : null}
                          {assignees.map((assignee) => (
                            <option key={assignee.userId} value={assignee.userId}>
                              {assignee.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                    </li>
                  );
                })}
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
