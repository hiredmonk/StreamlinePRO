import { Button } from '@/app/components/ui/button';
import { createProjectFromTemplateFromForm } from '@/lib/actions/form-actions';
import type { ProjectTemplateSummary } from '@/lib/contracts/project-templates';

export function CreateFromTemplateForm({
  workspaceId,
  actorUserId,
  templates,
  className
}: {
  workspaceId: string;
  actorUserId: string;
  templates: ProjectTemplateSummary[];
  className?: string;
}) {
  if (!templates.length) {
    return null;
  }

  return (
    <form
      action={createProjectFromTemplateFromForm}
      className={className ?? 'glass-panel grid gap-3 p-4 md:grid-cols-[1.2fr_1.1fr_auto_auto] md:items-center'}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      <input type="hidden" name="actorUserId" value={actorUserId} />
      <select
        required
        name="templateId"
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm"
      >
        {templates.map((template) => (
          <option key={template.id} value={template.id}>
            {template.name} ({template.statusCount} statuses, {template.sectionCount} sections
            {template.includeTasks ? `, ${template.taskCount} tasks` : ''})
          </option>
        ))}
      </select>
      <input
        required
        name="projectName"
        placeholder="New project name from template"
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm"
      />
      <input
        type="date"
        name="dueAnchorDate"
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm"
      />
      <Button type="submit" tone="brand">
        Create from template
      </Button>
    </form>
  );
}
