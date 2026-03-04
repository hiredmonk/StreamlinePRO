import { Button } from '@/app/components/ui/button';
import { createProjectTemplateFromForm } from '@/lib/actions/form-actions';

export function SaveProjectTemplateForm({
  workspaceId,
  projectId,
  actorUserId,
  className
}: {
  workspaceId: string;
  projectId: string;
  actorUserId: string;
  className?: string;
}) {
  return (
    <form
      action={createProjectTemplateFromForm}
      className={className ?? 'glass-panel grid gap-3 p-4 md:grid-cols-[1.2fr_auto_auto] md:items-center'}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="sourceProjectId" value={projectId} />
      <input type="hidden" name="actorUserId" value={actorUserId} />
      <input
        required
        name="name"
        placeholder="Template name"
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm"
      />
      <label className="flex h-10 items-center gap-2 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm text-[#434944]">
        <input
          type="checkbox"
          name="includeTasks"
          defaultChecked
          className="h-4 w-4"
        />
        Include open tasks
      </label>
      <Button type="submit" tone="neutral">
        Save as template
      </Button>
    </form>
  );
}
