import { createProjectFromForm } from '@/lib/actions/form-actions';
import { Button } from '@/app/components/ui/button';

export function CreateProjectForm({
  workspaceId,
  className
}: {
  workspaceId: string;
  className?: string;
}) {
  return (
    <form action={createProjectFromForm} className={className ?? 'glass-panel grid gap-3 p-4 md:grid-cols-4'}>
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input
        required
        name="name"
        placeholder="New project name"
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm"
      />
      <input
        name="description"
        placeholder="Description (optional)"
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm"
      />
      <select name="privacy" defaultValue="workspace_visible" className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm">
        <option value="workspace_visible">Workspace visible</option>
        <option value="private">Private</option>
      </select>
      <Button type="submit" tone="brand">
        Create project
      </Button>
    </form>
  );
}
