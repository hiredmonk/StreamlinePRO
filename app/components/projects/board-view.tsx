'use client';

import { CalendarClock, Clock3 } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createTaskAction, moveTaskAction, updateTaskAction } from '@/lib/actions/task-actions';
import { completeTaskFromForm } from '@/lib/actions/form-actions';
import { PriorityBadge } from '@/app/components/ui/badge';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';
import { useBoardTasks } from '@/lib/hooks/use-board-tasks';
import { getTaskCardMeta } from '@/lib/view-models/task-card';

type BoardViewProps = {
  projectId: string;
  currentUserId: string;
  statuses: Array<{ id: string; name: string; color: string; laneVersion?: number }>;
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
  currentUserId,
  statuses,
  tasks,
  assignees,
  drawerPathname
}: BoardViewProps) {
  const { columns, isPending, moveTask, boardMessage, clearBoardMessage } = useBoardTasks({
    tasks,
    statuses,
    moveTask: moveTaskAction,
    projectId
  });
  const router = useRouter();
  const [assigneeOverrides, setAssigneeOverrides] = useState<Record<string, string>>({});
  const [quickAddDrafts, setQuickAddDrafts] = useState<Record<string, string>>({});
  const [quickAddErrors, setQuickAddErrors] = useState<Record<string, string>>({});
  const [activeQuickAddStatusId, setActiveQuickAddStatusId] = useState<string | null>(null);
  const [isAssigneePending, startAssigneeTransition] = useTransition();
  const [isQuickAddPending, startQuickAddTransition] = useTransition();
  const dropTargetIndexRef = useRef<Record<string, number>>({});

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

  function openQuickAdd(statusId: string) {
    setActiveQuickAddStatusId(statusId);
    setQuickAddErrors((current) => ({
      ...current,
      [statusId]: ''
    }));
  }

  function closeQuickAdd(statusId: string) {
    setActiveQuickAddStatusId((current) => (current === statusId ? null : current));
    setQuickAddDrafts((current) => ({
      ...current,
      [statusId]: ''
    }));
    setQuickAddErrors((current) => ({
      ...current,
      [statusId]: ''
    }));
  }

  function saveQuickAdd(statusId: string) {
    if (isQuickAddPending) {
      return;
    }

    const title = (quickAddDrafts[statusId] ?? '').trim();
    if (!title) {
      setQuickAddErrors((current) => ({
        ...current,
        [statusId]: 'Task title is required.'
      }));
      return;
    }

    setQuickAddErrors((current) => ({
      ...current,
      [statusId]: ''
    }));

    startQuickAddTransition(() => {
      void (async () => {
        const result = await createTaskAction({
          projectId,
          statusId,
          title
        });

        if (!result.ok) {
          setQuickAddErrors((current) => ({
            ...current,
            [statusId]: result.error
          }));
          return;
        }

        closeQuickAdd(statusId);
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
          {isPending || isAssigneePending || isQuickAddPending ? '| syncing' : ''}
        </p>
      </div>
      {boardMessage ? (
        <div className="flex items-center justify-between rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span>{boardMessage}</span>
          <button type="button" onClick={clearBoardMessage} className="ml-3 text-amber-600 hover:text-amber-800">
            Dismiss
          </button>
        </div>
      ) : null}
      <div className="overflow-x-auto pb-1">
        <div
          className="grid min-w-max gap-3"
          style={{ gridTemplateColumns: `repeat(${Math.max(statuses.length, 1)}, minmax(220px, 1fr))` }}
        >
          {columns.map((column) => (
            <div
              key={column.id}
              className="rounded-2xl border border-[#d9cfb9] bg-[#fff9ef] p-3"
              onDragOver={(event) => {
                event.preventDefault();
                // Fallback: set drop index to end of lane
                dropTargetIndexRef.current[column.id] = column.items.length;
              }}
              onDrop={(event) => {
                const taskId = event.dataTransfer.getData('text/task-id');
                if (taskId) {
                  const targetIndex = dropTargetIndexRef.current[column.id] ?? column.items.length;
                  void moveTask(taskId, column.id, targetIndex);
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
                {column.items.map((task, cardIndex) => {
                  const currentAssignee = getAssignee(task);
                  const hasFormerAssignee = Boolean(task.assignee_id && !currentAssignee);
                  const taskMeta = getTaskCardMeta(task);

                  return (
                    <li
                      key={task.id}
                      draggable
                      tabIndex={0}
                      data-task-id={task.id}
                      onDragStart={(event) => {
                        event.dataTransfer.setData('text/task-id', task.id);
                      }}
                      onDragOver={(event) => {
                        event.preventDefault();
                        const rect = event.currentTarget.getBoundingClientRect();
                        dropTargetIndexRef.current[column.id] =
                          event.clientY < rect.top + rect.height / 2 ? cardIndex : cardIndex + 1;
                      }}
                      className="cursor-grab rounded-xl border border-[#dfd3bc] bg-white p-3 active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d37f43] focus-visible:ring-offset-2"
                    >
                      <a
                        href={`${drawerPathname}?task=${task.id}`}
                        data-shortcut-open-drawer
                        className="line-clamp-2 text-sm font-semibold text-[#2b312d] hover:text-[#af3324]"
                      >
                        {task.title}
                      </a>
                      <p className="mt-2 text-[11px] uppercase tracking-wide text-[#7a7d77]">
                        {task.section?.name ?? 'No section'}
                      </p>
                      <div className="mt-3 space-y-2 text-xs text-[#5e625e]">
                        <span className="inline-flex items-center gap-1">
                          <CalendarClock className="h-3.5 w-3.5" />
                          {taskMeta.dueLabel}
                        </span>
                        {taskMeta.relativeDueLabel ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" />
                            {taskMeta.relativeDueLabel}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        {taskMeta.isOverdue ? (
                          <span className="rounded-full bg-[#ffede8] px-2 py-1 font-semibold text-[#b63f2e]">
                            Overdue
                          </span>
                        ) : null}
                        {taskMeta.isWaiting ? (
                          <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 font-semibold text-amber-700">
                            Waiting
                          </span>
                        ) : null}
                        {taskMeta.priority ? <PriorityBadge priority={taskMeta.priority} /> : null}
                      </div>
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
                      <form action={completeTaskFromForm} className="hidden">
                        <input type="hidden" name="id" value={task.id} />
                        <button type="submit" data-shortcut-complete />
                      </form>
                    </li>
                  );
                })}
                {!column.items.length ? (
                  <li className="rounded-lg border border-dashed border-[#d6cbb3] p-3 text-xs text-[#80827e]">
                    Drop tasks here
                  </li>
                ) : null}
                <li className="rounded-xl border border-dashed border-[#d6cbb3] bg-[#fffcf6] p-3">
                  {activeQuickAddStatusId === column.id ? (
                    <div className="space-y-2">
                      <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b6f69]">
                        Card title
                        <input
                          aria-label={`Quick add card in ${column.name}`}
                          autoFocus
                          value={quickAddDrafts[column.id] ?? ''}
                          onChange={(event) => {
                            const nextValue = event.currentTarget.value;
                            setQuickAddDrafts((current) => ({
                              ...current,
                              [column.id]: nextValue
                            }));
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              saveQuickAdd(column.id);
                            }

                            if (event.key === 'Escape') {
                              event.preventDefault();
                              closeQuickAdd(column.id);
                            }
                          }}
                          placeholder={`Add a card to ${column.name}`}
                          className="h-10 rounded-lg border border-[#d8ceb6] bg-white px-3 text-sm font-normal normal-case tracking-normal text-[#2d332e]"
                        />
                      </label>
                      {quickAddErrors[column.id] ? (
                        <p className="text-xs font-medium text-[#b63f2e]">{quickAddErrors[column.id]}</p>
                      ) : null}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => saveQuickAdd(column.id)}
                          disabled={isQuickAddPending}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-[#d8caac] bg-[#f8ecd4] px-3 text-sm font-semibold text-[#544932] hover:bg-[#f2e3c3] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isQuickAddPending ? 'Adding...' : 'Add card'}
                        </button>
                        <button
                          type="button"
                          onClick={() => closeQuickAdd(column.id)}
                          disabled={isQuickAddPending}
                          className="inline-flex h-9 items-center justify-center rounded-lg border border-[#d8ceb6] bg-white px-3 text-sm text-[#5d625d] hover:bg-[#f8eedb] disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => openQuickAdd(column.id)}
                      className="w-full rounded-lg border border-[#d8ceb6] bg-white px-3 py-2 text-left text-sm font-semibold text-[#544932] hover:bg-[#f8eedb]"
                    >
                      Add card
                    </button>
                  )}
                </li>
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
