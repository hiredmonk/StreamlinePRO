import { formatDistanceToNowStrict } from 'date-fns';
import { CalendarClock, CheckCircle2, Clock3, LoaderCircle } from 'lucide-react';
import { completeTaskFromForm, updateTaskFromForm } from '@/lib/actions/form-actions';
import { formatDueDate, toDateTimeLocalValue } from '@/lib/domain/tasks/format';
import { PriorityBadge, StatusBadge } from '@/app/components/ui/badge';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';

type TaskRowProps = {
  task: TaskWithRelations;
  statuses: Array<{ id: string; name: string }>;
  sections?: Array<{ id: string; name: string }>;
  drawerHref: string;
};

export function TaskRow({ task, statuses, sections = [], drawerHref }: TaskRowProps) {
  const isOverdue = Boolean(task.due_at && !task.completed_at && new Date(task.due_at) < new Date());

  return (
    <article className="rounded-2xl border border-[#ddd3bf] bg-[#fffdf8] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a href={drawerHref} className="text-[17px] font-semibold text-[#222] hover:text-[#a23a2f]">
            {task.title}
          </a>
          <p className="mt-1 text-xs text-[#6b6f6a]">
            {task.project.name}
            {task.section ? ` · ${task.section.name}` : ''}
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
          {formatDueDate(task.due_at)}
        </span>
        {task.due_at ? (
          <span className="inline-flex items-center gap-1">
            <Clock3 className="h-3.5 w-3.5" />
            {formatDistanceToNowStrict(new Date(task.due_at), { addSuffix: true })}
          </span>
        ) : null}
        {isOverdue ? (
          <span className="rounded-full bg-[#ffede8] px-2 py-1 font-semibold text-[#b63f2e]">Overdue</span>
        ) : null}
      </div>

      <div className="grid gap-2 md:grid-cols-[auto_1fr]">
        <form action={completeTaskFromForm}>
          <input type="hidden" name="id" value={task.id} />
          <button
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#b8ccb4] bg-[#ebf7ec] px-3 text-sm font-semibold text-[#1f6a39] transition hover:bg-[#dff2e2]"
            type="submit"
          >
            <CheckCircle2 className="h-4 w-4" />
            Complete
          </button>
        </form>

        <form action={updateTaskFromForm} className="grid gap-2 sm:grid-cols-4">
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
