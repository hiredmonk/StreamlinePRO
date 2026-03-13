import { Button } from '@/app/components/ui/button';
import { createFollowUpTaskFromForm } from '@/lib/actions/form-actions';

type FollowUpTaskFormProps = {
  sourceTaskId: string;
  sourceTitle: string;
  assignees: Array<{
    userId: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    initials: string;
  }>;
  defaultAssigneeId?: string | null;
  defaultPriority?: 'low' | 'medium' | 'high' | null;
  returnTo: string;
};

export function FollowUpTaskForm({
  sourceTaskId,
  sourceTitle,
  assignees,
  defaultAssigneeId,
  defaultPriority,
  returnTo
}: FollowUpTaskFormProps) {
  return (
    <form action={createFollowUpTaskFromForm} className="grid gap-2 rounded-xl border border-[#ddd2bc] bg-[#fffdf8] p-3">
      <input type="hidden" name="sourceTaskId" value={sourceTaskId} />
      <input type="hidden" name="returnTo" value={returnTo} />
      <label className="grid gap-1 text-xs text-[#6d6f6c]">
        Follow-up title
        <input
          required
          name="title"
          placeholder={`Next step after ${sourceTitle}`}
          className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3 text-sm"
        />
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="grid gap-1 text-xs text-[#6d6f6c]">
          Owner
          <select
            name="assigneeId"
            defaultValue={defaultAssigneeId ?? ''}
            className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3 text-sm"
          >
            <option value="">Unassigned</option>
            {assignees.map((assignee) => (
              <option key={assignee.userId} value={assignee.userId}>
                {assignee.displayName}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-[#6d6f6c]">
          Priority
          <select
            name="priority"
            defaultValue={defaultPriority ?? ''}
            className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3 text-sm"
          >
            <option value="">No priority</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
      </div>
      <label className="grid gap-1 text-xs text-[#6d6f6c]">
        Due date
        <input
          type="datetime-local"
          name="dueAtLocal"
          className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3 text-sm"
        />
      </label>
      <Button type="submit" tone="brand">
        Create follow-up
      </Button>
    </form>
  );
}
