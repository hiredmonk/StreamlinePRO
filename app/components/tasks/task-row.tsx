import { CalendarClock, CheckCircle2, Clock3, LoaderCircle } from 'lucide-react';
import { completeTaskFromForm, updateTaskFromForm } from '@/lib/actions/form-actions';
import { toDateTimeLocalValue } from '@/lib/domain/tasks/format';
import { PriorityBadge, StatusBadge } from '@/app/components/ui/badge';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';
import { getTaskRowMeta } from '@/lib/view-models/task-row';

type TaskRowProps = {
  task: TaskWithRelations;
  statuses: Array<{ id: string; name: string }>;
  sections?: Array<{ id: string; name: string }>;
  assignees?: Array<{
    userId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    initials: string;
  }>;
  drawerHref: string;
  completionReturnTo?: string;
};

export function TaskRow({
  task,
  statuses,
  sections = [],
  assignees = [],
  drawerHref,
  completionReturnTo
}: TaskRowProps) {
  const { dueLabel, isOverdue, relativeDueLabel, sectionLabel } = getTaskRowMeta(task);
  const currentAssignee = assignees.find((assignee) => assignee.userId === task.assignee_id) ?? null;
  const hasFormerAssignee = Boolean(task.assignee_id && !currentAssignee);

  return (
    <article className="rounded-2xl border border-[#ddd3bf] bg-[#fffdf8] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a href={drawerHref} className="text-[17px] font-semibold text-[#222] hover:text-[#a23a2f]">
            {task.title}
          </a>
          <p className="mt-1 text-xs text-[#6b6f6a]">
            {task.project.name}
            {sectionLabel ? ` · ${sectionLabel}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge name={task.status.name} />
          <PriorityBadge priority={task.priority} />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-4 text-xs text-[#5d625d]">
        <span className="inline-flex items-center gap-1">
          <CalendarClock className="h-3.5 w-3.5" />
          {dueLabel}
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d8ccb4] bg-[#f8ecd4] text-[11px] font-semibold text-[#5f513d]">
            {currentAssignee?.initials ?? (hasFormerAssignee ? 'FM' : 'UN')}
          </span>
          {currentAssignee?.displayName ?? (hasFormerAssignee ? 'Former member' : 'Unassigned')}
        </span>
        {relativeDueLabel ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {relativeDueLabel}
          </span>
        ) : null}
        {isOverdue ? (
          <span className="rounded-full bg-[#ffede8] px-2 py-1 font-semibold text-[#b63f2e]">Overdue</span>
        ) : null}
      </div>

      <div className="grid gap-2 md:grid-cols-[auto_1fr]">
        <form action={completeTaskFromForm}>
          <input type="hidden" name="id" value={task.id} />
          {completionReturnTo ? <input type="hidden" name="returnTo" value={completionReturnTo} /> : null}
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#b8ccb4] bg-[#ebf7ec] px-3 text-sm font-semibold text-[#1f6a39] transition hover:bg-[#dff2e2]"
            type="submit"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete
          </button>
        </form>

        <form action={updateTaskFromForm} className="grid gap-2 sm:grid-cols-5">
          <input type="hidden" name="id" value={task.id} />
          <input type="hidden" name="title" value={task.title} />
          <input type="hidden" name="description" value={task.description ?? ''} />
          <select
            name="statusId"
            defaultValue={task.status_id}
            className="h-10 rounded-xl border border-[#d8ceb6] bg-white px-3 text-sm"
          >
            {statuses.map((status) => (
              <option key={status.id} value={status.id}>
                {status.name}
              </option>
            ))}
          </select>

          <select
            name="sectionId"
            defaultValue={task.section_id ?? ''}
            className="h-10 rounded-xl border border-[#d8ceb6] bg-white px-3 text-sm"
          >
            <option value="">No section</option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.name}
              </option>
            ))}
          </select>

          <label className="grid gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#6b6f69]">
            Owner
            <select
              name="assigneeId"
              defaultValue={task.assignee_id ?? ''}
              className="h-10 rounded-xl border border-[#d8ceb6] bg-white px-3 text-sm font-normal normal-case tracking-normal text-[#2d332e]"
            >
              <option value="">Unassigned</option>
              {hasFormerAssignee ? <option value={task.assignee_id ?? ''}>Former member</option> : null}
              {assignees.map((assignee) => (
                <option key={assignee.userId} value={assignee.userId}>
                  {assignee.displayName}
                </option>
              ))}
            </select>
          </label>

          <input
            type="datetime-local"
            name="dueAtLocal"
            defaultValue={toDateTimeLocalValue(task.due_at)}
            className="h-10 rounded-xl border border-[#d8ceb6] bg-white px-3 text-sm"
          />

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center gap-1 rounded-xl border border-[#d8ccb3] bg-[#fbf2df] px-3 text-sm font-semibold text-[#5a4e39] hover:bg-[#f5e8d1]"
          >
            <LoaderCircle className="h-4 w-4" />
            Save
          </button>
        </form>
      </div>
    </article>
  );
}
