import { createWorkspaceFromForm } from '@/lib/actions/form-actions';
import { Button } from '@/app/components/ui/button';

export function CreateWorkspaceForm({
  title = 'Create your first workspace',
  description = 'Workspaces hold projects, teams, and permissions.'
}: {
  title?: string;
  description?: string;
}) {
  return (
    <form action={createWorkspaceFromForm} className="glass-panel mx-auto grid max-w-xl gap-3 p-5">
      <h2 className="text-2xl font-semibold text-[#1f241f]" style={{ fontFamily: 'var(--font-display)' }}>
        {title}
      </h2>
      <p className="text-sm text-[#5d625d]">{description}</p>
      <input
        required
        name="name"
        placeholder="Workspace name"
        className="h-11 rounded-xl border border-[#d8ccb2] bg-white px-3 text-sm"
      />
      <input
        name="icon"
        placeholder="Emoji icon (optional)"
        className="h-11 rounded-xl border border-[#d8ccb2] bg-white px-3 text-sm"
      />
      <Button type="submit" tone="brand">
        Create workspace
      </Button>
    </form>
  );
}
