import { format } from 'date-fns';
import {
  addCommentFromForm,
  completeTaskFromForm,
  createTaskFromForm,
  updateTaskFromForm,
  uploadTaskAttachmentFromForm
} from '@/lib/actions/form-actions';
import { FollowUpTaskForm } from '@/app/components/tasks/follow-up-task-form';
import { PriorityBadge, StatusBadge } from '@/app/components/ui/badge';
import { toDateTimeLocalValue } from '@/lib/domain/tasks/format';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';

type TaskDrawerPanelProps = {
  task: TaskWithRelations;
  statuses: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string }>;
  assignees: Array<{
    userId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    initials: string;
  }>;
  subtasks: TaskWithRelations[];
  comments: Array<{ id: string; user_id: string; body: string; created_at: string }>;
  attachments: Array<{
    id: string;
    file_name: string;
    mime_type: string;
    size: number;
    created_at: string;
    uploaded_by: string;
    storage_path: string;
    signed_url?: string;
  }>;
  activity: Array<{
    id: string;
    event_type: string;
    actor_id: string;
    created_at: string;
  }>;
  closeHref: string;
  completionReturnTo?: string;
  mode?: 'details' | 'completed';
  recurringNotice?: string | null;
};

export function TaskDrawerPanel({
  task,
  statuses,
  sections,
  assignees,
  subtasks,
  comments,
  attachments,
  activity,
  closeHref,
  completionReturnTo,
  mode = 'details',
  recurringNotice
}: TaskDrawerPanelProps) {
  const currentAssignee = assignees.find((assignee) => assignee.userId === task.assignee_id) ?? null;
  const hasFormerAssignee = Boolean(task.assignee_id && !currentAssignee);
  const isCompletedMode = mode === 'completed';

  return (
    <aside className="glass-panel sticky top-6 h-fit max-h-[calc(100dvh-3rem)] overflow-y-auto p-5">
      <div className="mb-5 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#6f6a62]">
            {isCompletedMode ? 'Task completed' : 'Task details'}
          </p>
          <h2 className="text-xl font-semibold text-[#21231f]" style={{ fontFamily: 'var(--font-display)' }}>
            {task.title}
          </h2>
          <p className="mt-1 text-sm text-[#5c615b]">{task.project.name}</p>
        </div>
        <div className="flex items-center gap-2">
          {!isCompletedMode && completionReturnTo ? (
            <form action={completeTaskFromForm}>
              <input type="hidden" name="id" value={task.id} />
              <input type="hidden" name="returnTo" value={completionReturnTo} />
              <button
                type="submit"
                className="rounded-full border border-[#b7ccb2] bg-[#ebf7ec] px-3 py-1 text-sm font-semibold text-[#1f6a39] hover:bg-[#dff2e2]"
              >
                Complete task
              </button>
            </form>
          ) : null}
          <a href={closeHref} className="rounded-full border border-[#d8ccb6] px-3 py-1 text-sm hover:bg-[#f8eedb]">
            Close
          </a>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <StatusBadge name={task.status.name} />
        <PriorityBadge priority={task.priority} />
        <span className="inline-flex items-center gap-2 rounded-full border border-[#dccfb8] bg-white px-3 py-1 text-xs text-[#5e635d]">
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d8ccb4] bg-[#f8ecd4] text-[11px] font-semibold text-[#5f513d]">
            {currentAssignee?.initials ?? (hasFormerAssignee ? 'FM' : 'UN')}
          </span>
          {currentAssignee?.displayName ?? (hasFormerAssignee ? 'Former member' : 'Unassigned')}
        </span>
      </div>

      {isCompletedMode ? (
        <>
          <section className="rounded-2xl border border-[#bdd8c0] bg-[#eef8f0] p-4">
            <p className="text-sm font-semibold text-[#1f6a39]">Task marked done</p>
            <p className="mt-1 text-sm text-[#31553b]">
              Create the next step now so the workflow keeps moving without reopening the task later.
            </p>
            {recurringNotice ? <p className="mt-2 text-xs text-[#476d50]">{recurringNotice}</p> : null}
          </section>

          <section className="mt-5">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Create follow-up</h3>
            <p className="mt-1 text-sm text-[#676c66]">
              The new task stays in the same project and carries forward ownership and priority by default.
            </p>
            <div className="mt-3">
              <FollowUpTaskForm
                sourceTaskId={task.id}
                sourceTitle={task.title}
                assignees={assignees}
                defaultAssigneeId={task.assignee_id}
                defaultPriority={task.priority}
                returnTo={closeHref}
              />
            </div>
          </section>
        </>
      ) : (
        <>
          <form action={updateTaskFromForm} className="space-y-3 rounded-xl border border-[#ddd2bc] bg-[#fffdf8] p-3">
            <input type="hidden" name="id" value={task.id} />
            <label className="grid gap-1 text-xs text-[#6d6f6c]">
              Title
              <input
                name="title"
                defaultValue={task.title}
                className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3 text-sm"
              />
            </label>
            <label className="grid gap-1 text-xs text-[#6d6f6c]">
              Description
              <textarea
                name="description"
                defaultValue={task.description ?? ''}
                rows={4}
                className="rounded-lg border border-[#dccfb8] bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="grid gap-1 text-xs text-[#6d6f6c]">
                Status
                <select name="statusId" defaultValue={task.status_id} className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3">
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-xs text-[#6d6f6c]">
                Section
                <select name="sectionId" defaultValue={task.section_id ?? ''} className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3">
                  <option value="">No section</option>
                  {sections.map((section) => (
                    <option key={section.id} value={section.id}>
                      {section.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="grid gap-1 text-xs text-[#6d6f6c]">
              Owner
              <select
                name="assigneeId"
                defaultValue={task.assignee_id ?? ''}
                className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3"
              >
                <option value="">Unassigned</option>
                {hasFormerAssignee ? <option value={task.assignee_id ?? ''}>Former member</option> : null}
                {assignees.map((assignee) => (
                  <option key={assignee.userId} value={assignee.userId}>
                    {assignee.displayName}
                  </option>
                ))}
              </select>
              <span className="text-[11px] text-[#7a7d77]">
                Managers can reassign ownership here without leaving the drawer.
              </span>
            </label>
            <label className="grid gap-1 text-xs text-[#6d6f6c]">
              Due date and time
              <input
                type="datetime-local"
                name="dueAtLocal"
                defaultValue={toDateTimeLocalValue(task.due_at)}
                className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3"
              />
            </label>
            <button
              type="submit"
              className="h-10 w-full rounded-lg border border-[#d8caac] bg-[#f8ecd4] text-sm font-semibold text-[#544932] hover:bg-[#f2e3c3]"
            >
              Save task
            </button>
          </form>

          <section className="mt-5 rounded-xl border border-[#ddd2bc] bg-[#fff8ee] p-3">
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Keep the workflow moving</h3>
            <p className="mt-1 text-sm text-[#676c66]">
              If you already know the next step, complete the task from this drawer and create the follow-up without leaving the page.
            </p>
          </section>
        </>
      )}

      <section className="mt-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Subtasks</h3>
        <ul className="mt-2 space-y-2">
          {subtasks.map((subtask) => (
            <li key={subtask.id} className="rounded-lg border border-[#ddd2bc] bg-white px-3 py-2 text-sm text-[#343935]">
              {subtask.title}
            </li>
          ))}
          {!subtasks.length ? <li className="text-sm text-[#71756f]">No subtasks yet.</li> : null}
        </ul>
        {!isCompletedMode ? (
          <form action={createTaskFromForm} className="mt-3 grid gap-2">
            <input type="hidden" name="projectId" value={task.project_id} />
            <input type="hidden" name="statusId" value={task.status_id} />
            <input type="hidden" name="sectionId" value={task.section_id ?? ''} />
            <input type="hidden" name="parentTaskId" value={task.id} />
            <input
              required
              name="title"
              placeholder="Add subtask"
              className="h-10 rounded-lg border border-[#dbcfb7] bg-white px-3 text-sm"
            />
            <button type="submit" className="h-9 rounded-lg border border-[#d6c8aa] bg-[#f7edd8] text-sm font-semibold">
              Add subtask
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Comments</h3>
        <ul className="mt-2 space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-[#ddd2bc] bg-white px-3 py-2">
              <p className="text-sm text-[#2f342f]">{comment.body}</p>
              <p className="mt-1 text-[11px] text-[#7b7b76]">
                {comment.user_id.slice(0, 8)} | {format(new Date(comment.created_at), 'MMM d, HH:mm')}
              </p>
            </li>
          ))}
          {!comments.length ? <li className="text-sm text-[#71756f]">No comments yet.</li> : null}
        </ul>
        {!isCompletedMode ? (
          <form action={addCommentFromForm} className="mt-3 grid gap-2">
            <input type="hidden" name="taskId" value={task.id} />
            <textarea
              required
              name="body"
              placeholder="Write a comment... Use @ to mention"
              rows={3}
              className="rounded-lg border border-[#dbcfb7] bg-white px-3 py-2 text-sm"
            />
            <button type="submit" className="h-9 rounded-lg border border-[#d6c8aa] bg-[#f7edd8] text-sm font-semibold">
              Post comment
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Attachments</h3>
        <ul className="mt-2 space-y-2">
          {attachments.map((attachment) => (
            <li key={attachment.id} className="rounded-lg border border-[#ddd2bc] bg-white px-3 py-2">
              {attachment.signed_url ? (
                <a
                  href={attachment.signed_url}
                  className="text-sm font-semibold text-[#2d3430] hover:text-[#a93a2b]"
                >
                  {attachment.file_name}
                </a>
              ) : (
                <p className="text-sm font-semibold text-[#2d3430]">{attachment.file_name}</p>
              )}
              <p className="mt-1 text-[11px] text-[#7b7b76]">
                {Math.ceil(attachment.size / 1024)} KB | {format(new Date(attachment.created_at), 'MMM d, HH:mm')}
              </p>
            </li>
          ))}
          {!attachments.length ? <li className="text-sm text-[#71756f]">No attachments yet.</li> : null}
        </ul>
        {!isCompletedMode ? (
          <form action={uploadTaskAttachmentFromForm} className="mt-3 grid gap-2">
            <input type="hidden" name="taskId" value={task.id} />
            <input type="file" name="file" className="rounded-lg border border-[#dbcfb7] bg-white px-3 py-2 text-sm" />
            <button type="submit" className="h-9 rounded-lg border border-[#d6c8aa] bg-[#f7edd8] text-sm font-semibold">
              Upload attachment
            </button>
          </form>
        ) : null}
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Activity</h3>
        <ul className="mt-2 space-y-2">
          {activity.map((event) => (
            <li key={event.id} className="rounded-lg border border-[#ddd2bc] bg-white px-3 py-2 text-sm">
              <p className="font-semibold text-[#2b312c]">{event.event_type.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-[11px] text-[#7b7b76]">
                {event.actor_id.slice(0, 8)} | {format(new Date(event.created_at), 'MMM d, HH:mm')}
              </p>
            </li>
          ))}
          {!activity.length ? <li className="text-sm text-[#71756f]">No activity recorded yet.</li> : null}
        </ul>
      </section>
    </aside>
  );
}
