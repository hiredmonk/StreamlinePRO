import { createTaskFromForm } from '@/lib/actions/form-actions';
import { Button } from '@/app/components/ui/button';

type QuickAddFormProps = {
  projects: Array<{
    id: string;
    name: string;
  }>;
  preselectedProjectId?: string;
};

export function QuickAddForm({ projects, preselectedProjectId }: QuickAddFormProps) {
  const initialProjectId = preselectedProjectId ?? projects[0]?.id ?? '';

  return (
    <form action={createTaskFromForm} className="glass-panel grid gap-3 p-4 sm:grid-cols-[1.2fr_0.8fr_0.8fr_auto]">
      <input
        required
        name="title"
        placeholder="Add a task in under 5 seconds..."
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm outline-none focus:border-[#d68f54]"
      />

      <select
        name="projectId"
        defaultValue={initialProjectId}
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm outline-none"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>

      <input
        name="dueAtLocal"
        type="datetime-local"
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm outline-none"
      />

      <Button type="submit" tone="brand">
        Create
      </Button>
    </form>
  );
}
