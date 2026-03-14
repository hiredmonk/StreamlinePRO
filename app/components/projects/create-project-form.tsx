'use client';

import { useState } from 'react';
import { createProjectFromForm } from '@/lib/actions/form-actions';
import { Button } from '@/app/components/ui/button';
import type { ProjectTemplateSummary } from '@/lib/contracts/project-templates';

export function CreateProjectForm({
  workspaceId,
  templates,
  className,
  id
}: {
  workspaceId: string;
  templates?: ProjectTemplateSummary[];
  className?: string;
  id?: string;
}) {
  const [description, setDescription] = useState('');

  function handleTemplateChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const selected = templates?.find((t) => t.id === e.target.value);
    setDescription(selected?.description ?? '');
  }

  return (
    <form
      id={id}
      action={createProjectFromForm}
      className={className ?? 'glass-panel grid gap-3 p-4 md:grid-cols-4'}
    >
      <input type="hidden" name="workspaceId" value={workspaceId} />
      {templates && templates.length > 0 ? (
        <select
          name="templateId"
          defaultValue=""
          onChange={handleTemplateChange}
          className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm"
        >
          <option value="">Blank project</option>
          {templates.map((template) => (
            <option key={template.id} value={template.id}>
              {template.name} ({template.taskCount} tasks)
            </option>
          ))}
        </select>
      ) : null}
      <input
        required
        name="name"
        placeholder="New project name"
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm"
      />
      <input
        name="description"
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
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
