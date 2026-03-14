'use client';

import { useEffect, useState } from 'react';
import { createTaskFromForm } from '@/lib/actions/form-actions';
import { Button } from '@/app/components/ui/button';

type PriorityValue = 'low' | 'medium' | 'high' | '';

type AssigneeOption = {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
};

type QuickAddFormProps = {
  projects: Array<{
    id: string;
    name: string;
  }>;
  assigneesByProject?: Record<string, AssigneeOption[]>;
  preselectedProjectId?: string;
  currentUserId?: string;
  defaultAssigneeMode?: 'none' | 'self-when-allowed';
  defaultPriority?: PriorityValue;
  id?: string;
  projectLocked?: boolean;
  submitLabel?: string;
  autoFocusTitle?: boolean;
};

export function QuickAddForm({
  projects,
  assigneesByProject = {},
  preselectedProjectId,
  currentUserId,
  defaultAssigneeMode = 'none',
  defaultPriority = '',
  id,
  projectLocked = false,
  submitLabel = 'Create',
  autoFocusTitle = false
}: QuickAddFormProps) {
  const initialProjectId = preselectedProjectId ?? projects[0]?.id ?? '';
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState(
    resolveDefaultAssigneeId({
      assigneesByProject,
      currentUserId,
      defaultAssigneeMode,
      projectId: initialProjectId
    })
  );
  const [selectedPriority, setSelectedPriority] = useState<PriorityValue>(defaultPriority);

  useEffect(() => {
    setSelectedProjectId(initialProjectId);
  }, [initialProjectId]);

  useEffect(() => {
    setSelectedAssigneeId(
      resolveDefaultAssigneeId({
        assigneesByProject,
        currentUserId,
        defaultAssigneeMode,
        projectId: selectedProjectId
      })
    );
  }, [assigneesByProject, currentUserId, defaultAssigneeMode, selectedProjectId]);

  useEffect(() => {
    setSelectedPriority(defaultPriority);
  }, [defaultPriority]);

  const assigneeOptions = assigneesByProject[selectedProjectId] ?? [];

  return (
    <form id={id} action={createTaskFromForm} className="glass-panel grid gap-3 p-4 xl:grid-cols-[1.3fr_0.95fr_0.95fr_0.9fr_1fr_auto]">
      <input
        required
        name="title"
        autoFocus={autoFocusTitle}
        data-shortcut-target="new-task-input"
        placeholder="Add a task in under 5 seconds..."
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm outline-none focus:border-[#d68f54]"
      />

      <select
        name="projectId"
        value={selectedProjectId}
        onChange={(event) => setSelectedProjectId(event.currentTarget.value)}
        disabled={projectLocked}
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm outline-none disabled:bg-[#f3ede1] disabled:text-[#6c6a63]"
      >
        {projects.map((project) => (
          <option key={project.id} value={project.id}>
            {project.name}
          </option>
        ))}
      </select>
      {projectLocked ? <input type="hidden" name="projectId" value={selectedProjectId} /> : null}

      <select
        name="assigneeId"
        value={selectedAssigneeId}
        onChange={(event) => setSelectedAssigneeId(event.currentTarget.value)}
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm outline-none"
      >
        <option value="">Unassigned</option>
        {assigneeOptions.map((assignee) => (
          <option key={assignee.userId} value={assignee.userId}>
            {assignee.displayName}
          </option>
        ))}
      </select>

      <select
        name="priority"
        value={selectedPriority}
        onChange={(event) => setSelectedPriority(event.currentTarget.value as PriorityValue)}
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm outline-none"
      >
        <option value="">No priority</option>
        <option value="low">Low</option>
        <option value="medium">Medium</option>
        <option value="high">High</option>
      </select>

      <input
        name="dueAtLocal"
        type="datetime-local"
        className="h-10 rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm outline-none"
      />

      <Button type="submit" tone="brand">
        {submitLabel}
      </Button>
    </form>
  );
}

function resolveDefaultAssigneeId(input: {
  assigneesByProject: Record<string, AssigneeOption[]>;
  currentUserId?: string;
  defaultAssigneeMode: 'none' | 'self-when-allowed';
  projectId: string;
}) {
  if (input.defaultAssigneeMode !== 'self-when-allowed' || !input.currentUserId) {
    return '';
  }

  const assigneeOptions = input.assigneesByProject[input.projectId] ?? [];
  return assigneeOptions.some((assignee) => assignee.userId === input.currentUserId)
    ? input.currentUserId
    : '';
}
