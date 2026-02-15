import { format } from 'date-fns';
import {
  addCommentFromForm,
  createTaskFromForm,
  updateTaskFromForm,
  uploadTaskAttachmentFromForm
} from '@/lib/actions/form-actions';
import { StatusBadge, PriorityBadge } from '@/app/components/ui/badge';
import { toDateTimeLocalValue } from '@/lib/domain/tasks/format';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';

type TaskDrawerPanelProps = {
  task: TaskWithRelations;
  statuses: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string }>;
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
};

export function TaskDrawerPanel({
  task,
  statuses,
  sections,
  subtasks,
  comments,
  attachments,
  activity,
  closeHref
}: TaskDrawerPanelProps) {
  return (
    <aside className="glass-panel sticky top-6 h-fit max-h-[calc(100dvh-3rem)] overflow-y-auto p-5">
      <div className="mb-5 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#6f6a62]">Task Details</p>
          <h2 className="text-xl font-semibold text-[#21231f]" style={{ fontFamily: 'var(--font-display)' }}>
            {task.title}
          </h2>
        </div>
        <a href={closeHref} className="rounded-full border border-[#d8ccb6] px-3 py-1 text-sm hover:bg-[#f8eedb]">
          Close
        </a>
      </div>

      <div className="mb-4 flex items-center gap-2">
        <StatusBadge name={task.status.name} />
        <PriorityBadge priority={task.priority} />
      </div>

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
          Due Date and Time
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
          Save Task
        </button>
      </form>

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
            Add Subtask
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Comments</h3>
        <ul className="mt-2 space-y-2">
          {comments.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-[#ddd2bc] bg-white px-3 py-2">
              <p className="text-sm text-[#2f342f]">{comment.body}</p>
              <p className="mt-1 text-[11px] text-[#7b7b76]">
                {comment.user_id.slice(0, 8)} · {format(new Date(comment.created_at), 'MMM d, HH:mm')}
              </p>
            </li>
          ))}
          {!comments.length ? <li className="text-sm text-[#71756f]">No comments yet.</li> : null}
        </ul>
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
            Post Comment
          </button>
        </form>
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
                {Math.ceil(attachment.size / 1024)} KB · {format(new Date(attachment.created_at), 'MMM d, HH:mm')}
              </p>
            </li>
          ))}
          {!attachments.length ? <li className="text-sm text-[#71756f]">No attachments yet.</li> : null}
        </ul>
        <form action={uploadTaskAttachmentFromForm} className="mt-3 grid gap-2">
          <input type="hidden" name="taskId" value={task.id} />
          <input type="file" name="file" className="rounded-lg border border-[#dbcfb7] bg-white px-3 py-2 text-sm" />
          <button type="submit" className="h-9 rounded-lg border border-[#d6c8aa] bg-[#f7edd8] text-sm font-semibold">
            Upload Attachment
          </button>
        </form>
      </section>

      <section className="mt-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Activity</h3>
        <ul className="mt-2 space-y-2">
          {activity.map((event) => (
            <li key={event.id} className="rounded-lg border border-[#ddd2bc] bg-white px-3 py-2 text-sm">
              <p className="font-semibold text-[#2b312c]">{event.event_type.replaceAll('_', ' ')}</p>
              <p className="mt-1 text-[11px] text-[#7b7b76]">
                {event.actor_id.slice(0, 8)} · {format(new Date(event.created_at), 'MMM d, HH:mm')}
              </p>
            </li>
          ))}
          {!activity.length ? <li className="text-sm text-[#71756f]">No activity recorded yet.</li> : null}
        </ul>
      </section>
    </aside>
  );
}
