'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import {
  createProjectSchema,
  createProjectStatusSchema,
  deleteProjectStatusSchema,
  reorderProjectStatusesSchema,
  saveProjectTemplateSchema,
  updateProjectStatusSchema
} from '@/lib/validators/project';
import { createWorkspaceSchema } from '@/lib/validators/workspace';
import { getProjectTemplateById } from '@/lib/domain/projects/template-queries';
import { DEFAULT_PROJECT_SECTIONS, DEFAULT_PROJECT_STATUSES } from '@/lib/constants/status-colors';
import { toErrorMessage } from '@/lib/utils';
import type { ActionResult } from '@/lib/actions/types';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';
import type {
  ProjectTemplateSnapshot,
  ProjectTemplateTaskSnapshot,
  ProjectTemplateSummary
} from '@/lib/contracts/project-templates';

type ProjectStatusRow = {
  id: string;
  project_id: string;
  name: string;
  color: string;
  is_done: boolean;
  sort_order: number;
};

type SourceStatusRow = {
  id: string;
  name: string;
  color: string;
  is_done: boolean;
  sort_order: number;
};

type SourceSectionRow = {
  id: string;
  name: string;
  sort_order: number;
};

type SourceTaskRow = {
  title: string;
  description: string | null;
  priority: string | null;
  status_id: string | null;
  section_id: string | null;
  sort_order: number;
};

type SourceProjectRow = {
  id: string;
  workspace_id: string;
  privacy: string;
  created_by: string;
};

export async function createWorkspaceAction(input: {
  name: string;
  icon?: string;
}): Promise<ActionResult<{ workspaceId: string }>> {
  try {
    const parsed = createWorkspaceSchema.parse(input);
    const { user, supabase } = await requireUser();
    const workspaceId = randomUUID();

    const { error } = await supabase
      .from('workspaces')
      .insert({
        id: workspaceId,
        name: parsed.name,
        icon: parsed.icon ?? null,
        created_by: user.id
      });

    if (error) {
      throw error ?? new Error('Workspace was not created.');
    }

    const { error: memberError } = await supabase.from('workspace_members').insert({
      workspace_id: workspaceId,
      user_id: user.id,
      role: 'admin'
    });

    if (memberError) {
      throw memberError;
    }

    revalidatePath('/projects');

    return { ok: true, data: { workspaceId } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function createProjectAction(input: {
  workspaceId: string;
  name: string;
  description?: string;
  privacy?: 'workspace_visible' | 'private';
  templateId?: string | null;
}): Promise<ActionResult<{ projectId: string }>> {
  try {
    const parsed = createProjectSchema.parse(input);
    const { user, supabase } = await requireUser();
    const projectId = randomUUID();

    const { error } = await supabase
      .from('projects')
      .insert({
        id: projectId,
        workspace_id: parsed.workspaceId,
        name: parsed.name,
        description: parsed.description ?? null,
        privacy: parsed.privacy,
        created_by: user.id
      });

    if (error) {
      throw error ?? new Error('Project was not created.');
    }

    try {
      const { error: memberError } = await supabase.from('project_members').insert({
        project_id: projectId,
        user_id: user.id,
        role: 'editor'
      });

      if (memberError) {
        throw memberError;
      }

      if (parsed.templateId) {
        await initializeProjectFromTemplate(supabase, projectId, parsed.templateId, user.id);
      } else {
        const { error: statusesError } = await supabase.from('project_statuses').insert(
          DEFAULT_PROJECT_STATUSES.map((status, index) => ({
            project_id: projectId,
            name: status.name,
            color: status.color,
            sort_order: index,
            is_done: status.is_done
          }))
        );

        if (statusesError) {
          throw statusesError;
        }

        const { error: sectionsError } = await supabase.from('project_sections').insert(
          DEFAULT_PROJECT_SECTIONS.map((name, index) => ({
            project_id: projectId,
            name,
            sort_order: index
          }))
        );

        if (sectionsError) {
          throw sectionsError;
        }
      }
    } catch (initializationError) {
      // Keep project creation all-or-nothing when defaults fail to initialize.
      await supabase.from('projects').delete().eq('id', projectId);
      throw initializationError;
    }

    revalidateProjectPaths(projectId);

    return { ok: true, data: { projectId } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

async function initializeProjectFromTemplate(
  supabase: AppSupabaseClient,
  projectId: string,
  templateId: string,
  userId: string
) {
  const template = await getProjectTemplateById(supabase, templateId);
  if (!template) {
    throw new Error('Template not found.');
  }

  const snapshot = template.snapshot_json;
  if (!snapshot.statuses?.length) {
    throw new Error('Template has no statuses configured.');
  }

  const statusRows = snapshot.statuses.map((status) => ({
    id: randomUUID(),
    project_id: projectId,
    name: status.name,
    color: status.color,
    sort_order: status.sortOrder,
    is_done: status.isDone
  }));

  const statusIdByName = new Map<string, string>();
  for (const statusRow of statusRows) {
    statusIdByName.set(normalizeName(statusRow.name), statusRow.id);
  }

  const { error: statusInsertError } = await supabase
    .from('project_statuses')
    .insert(statusRows);

  if (statusInsertError) {
    throw statusInsertError;
  }

  const sectionRows = snapshot.sections.map((section) => ({
    id: randomUUID(),
    project_id: projectId,
    name: section.name,
    sort_order: section.sortOrder
  }));

  const sectionIdByName = new Map<string, string>();
  for (const sectionRow of sectionRows) {
    sectionIdByName.set(normalizeName(sectionRow.name), sectionRow.id);
  }

  if (sectionRows.length) {
    const { error: sectionInsertError } = await supabase
      .from('project_sections')
      .insert(sectionRows);

    if (sectionInsertError) {
      throw sectionInsertError;
    }
  }

  if (template.include_tasks && snapshot.tasks.length) {
    const fallbackStatusId = statusRows[0].id;

    const taskRows = snapshot.tasks.map((task, index) => {
      const normalizedStatusName = task.statusName
        ? normalizeName(task.statusName)
        : '';
      const normalizedSectionName = task.sectionName
        ? normalizeName(task.sectionName)
        : '';

      const mappedStatusId =
        statusIdByName.get(normalizedStatusName) ?? fallbackStatusId;
      const mappedSectionId = normalizedSectionName
        ? sectionIdByName.get(normalizedSectionName) ?? null
        : null;

      return {
        id: randomUUID(),
        project_id: projectId,
        section_id: mappedSectionId,
        status_id: mappedStatusId,
        title: task.title,
        description: task.description ?? null,
        assignee_id: null,
        creator_id: userId,
        due_at: null,
        due_timezone: null,
        priority: task.priority,
        parent_task_id: null,
        recurrence_id: null,
        is_today: false,
        sort_order: index + 1,
        completed_at: null
      };
    });

    const { error: taskInsertError } = await supabase.from('tasks').insert(taskRows);
    if (taskInsertError) {
      throw taskInsertError;
    }
  }
}

export async function saveProjectTemplateAction(input: {
  projectId: string;
  name: string;
  description?: string;
  includeTasks: boolean;
}): Promise<ActionResult<{ template: ProjectTemplateSummary }>> {
  try {
    const parsed = saveProjectTemplateSchema.parse(input);
    const { user, supabase } = await requireUser();

    const sourceProject = await getSourceProject(supabase, parsed.projectId);

    if (sourceProject.privacy !== 'workspace_visible') {
      throw new Error('Only workspace-visible projects can be saved as templates.');
    }

    const canEdit = await canEditProject(supabase, sourceProject, user.id);
    if (!canEdit) {
      throw new Error('Only project editors can save templates from this project.');
    }

    await ensureTemplateNameIsAvailable(
      supabase,
      sourceProject.workspace_id,
      parsed.name
    );

    const [statuses, sections] = await Promise.all([
      getProjectStatusesSnapshot(supabase, sourceProject.id),
      getProjectSectionsSnapshot(supabase, sourceProject.id)
    ]);

    if (!statuses.length) {
      throw new Error('Source project must have at least one status.');
    }

    let tasks: ProjectTemplateTaskSnapshot[] = [];
    if (parsed.includeTasks) {
      tasks = await getProjectTasksSnapshot(supabase, sourceProject.id, statuses, sections);
    }

    const snapshot: ProjectTemplateSnapshot = {
      statuses: statuses.map((status) => ({
        name: status.name,
        color: status.color,
        isDone: status.is_done,
        sortOrder: status.sort_order
      })),
      sections: sections.map((section) => ({
        name: section.name,
        sortOrder: section.sort_order
      })),
      tasks
    };

    const templateId = randomUUID();

    const { error: templateInsertError } = await supabase
      .from('project_templates')
      .insert({
        id: templateId,
        workspace_id: sourceProject.workspace_id,
        source_project_id: sourceProject.id,
        name: parsed.name.trim(),
        description: parsed.description?.trim() || null,
        include_tasks: parsed.includeTasks,
        snapshot_json: snapshot,
        created_by: user.id
      });

    if (templateInsertError) {
      if (isUniqueViolation(templateInsertError)) {
        throw new Error('Template name already exists in this workspace.');
      }
      throw templateInsertError;
    }

    revalidatePath('/projects');
    revalidatePath('/my-tasks');

    const template: ProjectTemplateSummary = {
      id: templateId,
      workspaceId: sourceProject.workspace_id,
      sourceProjectId: sourceProject.id,
      name: parsed.name.trim(),
      description: parsed.description?.trim() || null,
      includeTasks: parsed.includeTasks,
      taskCount: tasks.length,
      createdBy: user.id,
      createdAt: new Date().toISOString()
    };

    return { ok: true, data: { template } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function createProjectStatusAction(input: {
  projectId: string;
  name: string;
  color?: string;
  isDone?: boolean;
}): Promise<ActionResult<{ statusId: string }>> {
  try {
    const parsed = createProjectStatusSchema.parse(input);
    const { supabase } = await requireUser();
    const statuses = await getProjectStatusesForMutation(supabase, parsed.projectId);

    if (hasDuplicateStatusName(statuses, parsed.name)) {
      throw new Error('Status name already exists in this project.');
    }

    const doneStatusCount =
      statuses.filter((status) => status.is_done).length + (parsed.isDone ? 1 : 0);
    if (doneStatusCount === 0) {
      throw new Error('At least one done status is required.');
    }

    const nextSortOrder = statuses.reduce((max, status) => Math.max(max, status.sort_order), -1) + 1;
    const statusId = randomUUID();

    const { error } = await supabase.from('project_statuses').insert({
      id: statusId,
      project_id: parsed.projectId,
      name: parsed.name.trim(),
      color: parsed.color ?? '#6e7781',
      sort_order: nextSortOrder,
      is_done: parsed.isDone ?? false
    });

    if (error) {
      throw error;
    }

    revalidateProjectPaths(parsed.projectId);

    return { ok: true, data: { statusId } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function updateProjectStatusAction(input: {
  id: string;
  name?: string;
  color?: string;
  isDone?: boolean;
}): Promise<ActionResult<{ statusId: string }>> {
  try {
    const parsed = updateProjectStatusSchema.parse(input);
    const { supabase } = await requireUser();

    const { data: existingStatus, error: existingStatusError } = await supabase
      .from('project_statuses')
      .select('id, project_id, name, is_done')
      .eq('id', parsed.id)
      .maybeSingle();

    if (existingStatusError || !existingStatus) {
      throw existingStatusError ?? new Error('Status not found.');
    }

    const statuses = await getProjectStatusesForMutation(supabase, existingStatus.project_id);

    if (parsed.name && hasDuplicateStatusName(statuses, parsed.name, parsed.id)) {
      throw new Error('Status name already exists in this project.');
    }

    const doneStatusCount = statuses.filter((status) => {
      if (status.id === parsed.id) {
        return parsed.isDone ?? status.is_done;
      }
      return status.is_done;
    }).length;

    if (doneStatusCount === 0) {
      throw new Error('At least one done status is required.');
    }

    const updatePayload: {
      name?: string;
      color?: string;
      is_done?: boolean;
    } = {};

    if (parsed.name !== undefined) {
      updatePayload.name = parsed.name.trim();
    }

    if (parsed.color !== undefined) {
      updatePayload.color = parsed.color;
    }

    if (parsed.isDone !== undefined) {
      updatePayload.is_done = parsed.isDone;
    }

    const { error } = await supabase
      .from('project_statuses')
      .update(updatePayload)
      .eq('id', parsed.id);

    if (error) {
      throw error;
    }

    revalidateProjectPaths(existingStatus.project_id);

    return { ok: true, data: { statusId: parsed.id } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function reorderProjectStatusesAction(input: {
  projectId: string;
  orderedStatusIds: string[];
}): Promise<ActionResult<{ projectId: string }>> {
  try {
    const parsed = reorderProjectStatusesSchema.parse(input);
    const { supabase } = await requireUser();
    const statuses = await getProjectStatusesForMutation(supabase, parsed.projectId);

    if (statuses.length !== parsed.orderedStatusIds.length) {
      throw new Error('Provided status order does not match project statuses.');
    }

    const expectedIds = new Set(statuses.map((status) => status.id));
    if (!parsed.orderedStatusIds.every((statusId) => expectedIds.has(statusId))) {
      throw new Error('Provided status order includes invalid statuses.');
    }

    await persistStatusOrder(supabase, parsed.orderedStatusIds);
    revalidateProjectPaths(parsed.projectId);

    return { ok: true, data: { projectId: parsed.projectId } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

export async function deleteProjectStatusAction(input: {
  id: string;
  fallbackStatusId: string;
}): Promise<ActionResult<{ deletedStatusId: string }>> {
  try {
    const parsed = deleteProjectStatusSchema.parse(input);
    const { supabase } = await requireUser();

    const { data: targetStatus, error: targetError } = await supabase
      .from('project_statuses')
      .select('id, project_id, is_done')
      .eq('id', parsed.id)
      .maybeSingle();

    if (targetError || !targetStatus) {
      throw targetError ?? new Error('Status not found.');
    }

    const { data: fallbackStatus, error: fallbackError } = await supabase
      .from('project_statuses')
      .select('id, project_id, is_done')
      .eq('id', parsed.fallbackStatusId)
      .maybeSingle();

    if (fallbackError || !fallbackStatus) {
      throw fallbackError ?? new Error('Fallback status not found.');
    }

    if (targetStatus.project_id !== fallbackStatus.project_id) {
      throw new Error('Fallback status must be in the same project.');
    }

    const statuses = await getProjectStatusesForMutation(supabase, targetStatus.project_id);

    if (statuses.length <= 1) {
      throw new Error('A project must keep at least one status.');
    }

    const remainingDoneStatuses = statuses.filter(
      (status) => status.id !== targetStatus.id && status.is_done
    );

    if (targetStatus.is_done && remainingDoneStatuses.length === 0) {
      throw new Error('At least one done status is required.');
    }

    const { error: reassignError } = await supabase
      .from('tasks')
      .update({
        status_id: parsed.fallbackStatusId,
        updated_at: new Date().toISOString()
      })
      .eq('status_id', parsed.id);

    if (reassignError) {
      throw reassignError;
    }

    const { error: deleteError } = await supabase
      .from('project_statuses')
      .delete()
      .eq('id', parsed.id);

    if (deleteError) {
      throw deleteError;
    }

    await normalizeProjectStatusOrder(supabase, targetStatus.project_id);
    revalidateProjectPaths(targetStatus.project_id);

    return { ok: true, data: { deletedStatusId: parsed.id } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

// --- Template helpers ---

async function getSourceProject(
  supabase: AppSupabaseClient,
  projectId: string
): Promise<SourceProjectRow> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, workspace_id, privacy, created_by')
    .eq('id', projectId)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error('Source project not found.');
  }

  return data as SourceProjectRow;
}

async function getProjectStatusesSnapshot(
  supabase: AppSupabaseClient,
  projectId: string
): Promise<SourceStatusRow[]> {
  const { data, error } = await supabase
    .from('project_statuses')
    .select('id, name, color, is_done, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as SourceStatusRow[];
}

async function getProjectSectionsSnapshot(
  supabase: AppSupabaseClient,
  projectId: string
): Promise<SourceSectionRow[]> {
  const { data, error } = await supabase
    .from('project_sections')
    .select('id, name, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as SourceSectionRow[];
}

async function getProjectTasksSnapshot(
  supabase: AppSupabaseClient,
  projectId: string,
  statuses: SourceStatusRow[],
  sections: SourceSectionRow[]
): Promise<ProjectTemplateTaskSnapshot[]> {
  const { data: sourceTasks, error } = await supabase
    .from('tasks')
    .select('title, description, priority, status_id, section_id, sort_order')
    .eq('project_id', projectId)
    .is('completed_at', null)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  const openTasks = (sourceTasks ?? []) as SourceTaskRow[];
  const statusNameById = new Map(statuses.map((status) => [status.id, status.name]));
  const sectionNameById = new Map(sections.map((section) => [section.id, section.name]));

  return openTasks.map((task) => ({
    title: task.title,
    description: task.description ?? undefined,
    priority: (task.priority as 'low' | 'medium' | 'high' | null) ?? null,
    statusName: task.status_id ? statusNameById.get(task.status_id) ?? null : null,
    sectionName: task.section_id ? sectionNameById.get(task.section_id) ?? null : null
  }));
}

async function canEditProject(
  supabase: AppSupabaseClient,
  sourceProject: SourceProjectRow,
  userId: string
): Promise<boolean> {
  if (sourceProject.created_by === userId) {
    return true;
  }

  const [{ data: projectMember, error: projectMemberError }, workspaceRole] =
    await Promise.all([
      supabase
        .from('project_members')
        .select('role')
        .eq('project_id', sourceProject.id)
        .eq('user_id', userId)
        .maybeSingle(),
      getWorkspaceRole(supabase, sourceProject.workspace_id, userId)
    ]);

  if (projectMemberError) {
    throw projectMemberError;
  }

  return projectMember?.role === 'editor' || workspaceRole === 'admin';
}

async function getWorkspaceRole(
  supabase: AppSupabaseClient,
  workspaceId: string,
  userId: string
): Promise<'admin' | 'member' | null> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return data.role;
}

async function ensureTemplateNameIsAvailable(
  supabase: AppSupabaseClient,
  workspaceId: string,
  name: string,
  excludeTemplateId?: string
) {
  const { data, error } = await supabase
    .from('project_templates')
    .select('id')
    .eq('workspace_id', workspaceId)
    .ilike('name', name.trim());

  if (error) {
    throw error;
  }

  const existing = (data ?? []) as Array<{ id: string }>;
  const duplicate = existing.some((row) => row.id !== excludeTemplateId);
  if (duplicate) {
    throw new Error('Template name already exists in this workspace.');
  }
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (error as { code?: unknown }).code === '23505';
}

// --- Status helpers ---

async function getProjectStatusesForMutation(
  supabase: AppSupabaseClient,
  projectId: string
): Promise<ProjectStatusRow[]> {
  const { data, error } = await supabase
    .from('project_statuses')
    .select('id, project_id, name, color, is_done, sort_order')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

function normalizeStatusName(name: string) {
  return name.trim().toLowerCase();
}

function hasDuplicateStatusName(
  statuses: ProjectStatusRow[],
  nextName: string,
  skipStatusId?: string
) {
  const normalized = normalizeStatusName(nextName);
  return statuses.some(
    (status) =>
      status.id !== skipStatusId && normalizeStatusName(status.name) === normalized
  );
}

async function persistStatusOrder(supabase: AppSupabaseClient, orderedStatusIds: string[]) {
  for (const [index, statusId] of orderedStatusIds.entries()) {
    const { error } = await supabase
      .from('project_statuses')
      .update({ sort_order: index })
      .eq('id', statusId);

    if (error) {
      throw error;
    }
  }
}

async function normalizeProjectStatusOrder(
  supabase: AppSupabaseClient,
  projectId: string
) {
  const statuses = await getProjectStatusesForMutation(supabase, projectId);
  await persistStatusOrder(
    supabase,
    statuses.map((status) => status.id)
  );
}

function revalidateProjectPaths(projectId: string) {
  revalidatePath('/projects');
  revalidatePath(`/projects/${projectId}`);
  revalidatePath('/my-tasks');
}
