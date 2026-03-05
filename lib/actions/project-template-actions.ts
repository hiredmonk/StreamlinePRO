'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { getProjectTemplateSummaries } from '@/lib/domain/projects/template-queries';
import {
  createProjectFromTemplateSchema,
  createProjectTemplateSchema,
  listProjectTemplatesSchema,
  updateProjectTemplateSchema
} from '@/lib/validators/project';
import { toErrorMessage } from '@/lib/utils';
import type {
  CreateProjectFromTemplateAction,
  CreateProjectFromTemplateOutput,
  CreateProjectTemplateAction,
  CreateProjectTemplateOutput,
  ListProjectTemplatesQuery,
  ProjectTemplateSummary,
  UpdateProjectTemplateAction,
  UpdateProjectTemplateOutput
} from '@/lib/contracts/project-templates';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

type SourceProjectRow = {
  id: string;
  workspace_id: string;
  created_by: string;
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
  due_at: string | null;
  status_id: string | null;
  section_id: string | null;
  sort_order: number;
};

type TemplateRow = {
  id: string;
  workspace_id: string;
  name: string;
  include_tasks: boolean;
  created_by: string;
  created_at: string;
};

type TemplateStatusRow = {
  name: string;
  color: string;
  is_done: boolean;
  sort_order: number;
};

type TemplateSectionRow = {
  name: string;
  sort_order: number;
};

type TemplateTaskRow = {
  title: string;
  description: string | null;
  status_name: string | null;
  section_name: string | null;
  due_offset_days: number | null;
  sort_order: number;
};

export const createProjectTemplateAction: CreateProjectTemplateAction = async (input) => {
  try {
    const parsed = createProjectTemplateSchema.parse(input);
    const { user, supabase } = await requireUser();
    assertActor(parsed.actorUserId, user.id);

    const sourceProject = await getSourceProject(supabase, parsed.sourceProjectId);

    if (sourceProject.workspace_id !== parsed.workspaceId) {
      throw new Error('Source project does not belong to the selected workspace.');
    }

    const canEditSourceProject = await canEditProject(
      supabase,
      sourceProject,
      user.id
    );
    if (!canEditSourceProject) {
      throw new Error('Only project editors can save templates from this project.');
    }

    await ensureTemplateNameIsAvailable(
      supabase,
      parsed.workspaceId,
      parsed.name
    );

    const [statuses, sections] = await Promise.all([
      getProjectStatusesSnapshot(supabase, sourceProject.id),
      getProjectSectionsSnapshot(supabase, sourceProject.id)
    ]);

    if (!statuses.length) {
      throw new Error('Source project must have at least one status.');
    }

    const templateId = randomUUID();

    const { error: templateInsertError } = await supabase
      .from('project_templates')
      .insert({
        id: templateId,
        workspace_id: parsed.workspaceId,
        source_project_id: parsed.sourceProjectId,
        name: parsed.name.trim(),
        include_tasks: parsed.includeTasks,
        created_by: user.id
      });

    if (templateInsertError) {
      if (isUniqueViolation(templateInsertError)) {
        throw new Error('Template name already exists in this workspace.');
      }
      throw templateInsertError;
    }

    const statusRows = statuses.map((status) => ({
      id: randomUUID(),
      template_id: templateId,
      name: status.name,
      color: status.color,
      is_done: status.is_done,
      sort_order: status.sort_order
    }));

    const sectionRows = sections.map((section) => ({
      id: randomUUID(),
      template_id: templateId,
      name: section.name,
      sort_order: section.sort_order
    }));

    const { error: statusInsertError } = await supabase
      .from('project_template_statuses')
      .insert(statusRows);
    if (statusInsertError) {
      await supabase.from('project_templates').delete().eq('id', templateId);
      throw statusInsertError;
    }

    if (sectionRows.length) {
      const { error: sectionInsertError } = await supabase
        .from('project_template_sections')
        .insert(sectionRows);
      if (sectionInsertError) {
        await supabase.from('project_templates').delete().eq('id', templateId);
        throw sectionInsertError;
      }
    }

    if (parsed.includeTasks) {
      await snapshotTemplateTasks({
        supabase,
        sourceProjectId: sourceProject.id,
        templateId,
        statuses,
        sections
      });
    }

    revalidateProjectPaths(null);

    const template = await getTemplateSummaryById(supabase, templateId);

    const output: CreateProjectTemplateOutput = { template };
    return { ok: true, data: output };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
};

export const updateProjectTemplateAction: UpdateProjectTemplateAction = async (input) => {
  try {
    const parsed = updateProjectTemplateSchema.parse(input);
    const { user, supabase } = await requireUser();
    assertActor(parsed.actorUserId, user.id);

    const template = await getTemplateRow(supabase, parsed.templateId);
    const canManageTemplate = await canManageTemplateByUser(
      supabase,
      template,
      user.id
    );
    if (!canManageTemplate) {
      throw new Error('Only template owners or workspace admins can update templates.');
    }

    if (parsed.name !== undefined) {
      await ensureTemplateNameIsAvailable(
        supabase,
        template.workspace_id,
        parsed.name,
        template.id
      );
    }

    const updatePayload: {
      name?: string;
      include_tasks?: boolean;
      updated_at?: string;
    } = {};

    if (parsed.name !== undefined) {
      updatePayload.name = parsed.name.trim();
    }
    if (parsed.includeTasks !== undefined) {
      updatePayload.include_tasks = parsed.includeTasks;
    }

    updatePayload.updated_at = new Date().toISOString();

    const { error: updateError } = await supabase
      .from('project_templates')
      .update(updatePayload)
      .eq('id', template.id);

    if (updateError) {
      if (isUniqueViolation(updateError)) {
        throw new Error('Template name already exists in this workspace.');
      }
      throw updateError;
    }

    revalidateProjectPaths(null);

    const updatedTemplate = await getTemplateSummaryById(supabase, template.id);
    const output: UpdateProjectTemplateOutput = { template: updatedTemplate };
    return { ok: true, data: output };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
};

export const createProjectFromTemplateAction: CreateProjectFromTemplateAction = async (
  input
) => {
  try {
    const parsed = createProjectFromTemplateSchema.parse(input);
    const { user, supabase } = await requireUser();
    assertActor(parsed.actorUserId, user.id);

    const workspaceRole = await getWorkspaceRole(
      supabase,
      parsed.workspaceId,
      user.id
    );
    if (!workspaceRole) {
      throw new Error('Workspace not found or inaccessible.');
    }

    const template = await getTemplateRow(supabase, parsed.templateId);
    if (template.workspace_id !== parsed.workspaceId) {
      throw new Error('Template does not belong to the selected workspace.');
    }

    const [templateStatuses, templateSections, templateTasks] = await Promise.all([
      getTemplateStatuses(supabase, template.id),
      getTemplateSections(supabase, template.id),
      getTemplateTasks(supabase, template.id)
    ]);

    if (!templateStatuses.length) {
      throw new Error('Template has no statuses configured.');
    }

    const projectId = randomUUID();

    const { error: projectInsertError } = await supabase
      .from('projects')
      .insert({
        id: projectId,
        workspace_id: parsed.workspaceId,
        name: parsed.projectName.trim(),
        privacy: 'workspace_visible',
        created_by: user.id
      });

    if (projectInsertError) {
      throw projectInsertError;
    }

    let createdTaskCount = 0;

    try {
      const { error: memberInsertError } = await supabase.from('project_members').insert({
        project_id: projectId,
        user_id: user.id,
        role: 'editor'
      });

      if (memberInsertError) {
        throw memberInsertError;
      }

      const statusRows = templateStatuses.map((status) => ({
        id: randomUUID(),
        project_id: projectId,
        name: status.name,
        color: status.color,
        sort_order: status.sort_order,
        is_done: status.is_done
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

      const sectionRows = templateSections.map((section) => ({
        id: randomUUID(),
        project_id: projectId,
        name: section.name,
        sort_order: section.sort_order
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

      if (template.include_tasks && templateTasks.length) {
        const dueAnchor = parsed.dueAnchorDate
          ? parseDueAnchorDate(parsed.dueAnchorDate)
          : null;
        const fallbackStatusId = statusRows[0].id;

        const taskRows = templateTasks.map((task, index) => {
          const normalizedStatusName = task.status_name
            ? normalizeName(task.status_name)
            : '';
          const normalizedSectionName = task.section_name
            ? normalizeName(task.section_name)
            : '';

          const mappedStatusId =
            statusIdByName.get(normalizedStatusName) ?? fallbackStatusId;
          const mappedSectionId = normalizedSectionName
            ? sectionIdByName.get(normalizedSectionName) ?? null
            : null;

          const dueAt =
            dueAnchor && task.due_offset_days !== null
              ? toIsoDueAtFromOffset(dueAnchor, task.due_offset_days)
              : null;

          return {
            id: randomUUID(),
            project_id: projectId,
            section_id: mappedSectionId,
            status_id: mappedStatusId,
            title: task.title,
            description: task.description,
            assignee_id: null,
            creator_id: user.id,
            due_at: dueAt,
            due_timezone: null,
            priority: null,
            parent_task_id: null,
            recurrence_id: null,
            is_today: false,
            sort_order: task.sort_order ?? index + 1,
            completed_at: null
          };
        });

        const { error: taskInsertError } = await supabase.from('tasks').insert(taskRows);
        if (taskInsertError) {
          throw taskInsertError;
        }
        createdTaskCount = taskRows.length;
      }
    } catch (initializationError) {
      await supabase.from('projects').delete().eq('id', projectId);
      throw initializationError;
    }

    revalidateProjectPaths(projectId);

    const output: CreateProjectFromTemplateOutput = {
      projectId,
      workspaceId: parsed.workspaceId,
      templateId: template.id,
      createdStatusCount: templateStatuses.length,
      createdSectionCount: templateSections.length,
      createdTaskCount
    };

    return { ok: true, data: output };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
};

export const listProjectTemplatesQuery: ListProjectTemplatesQuery = async (input) => {
  const parsed = listProjectTemplatesSchema.parse(input);
  const { user, supabase } = await requireUser();
  assertActor(parsed.actorUserId, user.id);

  const workspaceRole = await getWorkspaceRole(
    supabase,
    parsed.workspaceId,
    user.id
  );
  if (!workspaceRole) {
    throw new Error('Workspace not found or inaccessible.');
  }

  const templates = await getProjectTemplateSummaries(supabase, parsed.workspaceId);
  return { templates };
};

async function snapshotTemplateTasks({
  supabase,
  sourceProjectId,
  templateId,
  statuses,
  sections
}: {
  supabase: AppSupabaseClient;
  sourceProjectId: string;
  templateId: string;
  statuses: SourceStatusRow[];
  sections: SourceSectionRow[];
}) {
  const { data: sourceTasks, error: sourceTasksError } = await supabase
    .from('tasks')
    .select('title, description, due_at, status_id, section_id, sort_order')
    .eq('project_id', sourceProjectId)
    .is('completed_at', null)
    .order('sort_order', { ascending: true });

  if (sourceTasksError) {
    await supabase.from('project_templates').delete().eq('id', templateId);
    throw sourceTasksError;
  }

  const openTasks = (sourceTasks ?? []) as SourceTaskRow[];
  const dueCandidates = openTasks.filter((task) => task.due_at);
  const baselineDueMs = dueCandidates.length
    ? Math.min(...dueCandidates.map((task) => toUtcDayStartMilliseconds(task.due_at!)))
    : null;

  const statusNameById = new Map(statuses.map((status) => [status.id, status.name]));
  const sectionNameById = new Map(sections.map((section) => [section.id, section.name]));

  const templateTaskRows = openTasks.map((task, index) => ({
    id: randomUUID(),
    template_id: templateId,
    title: task.title,
    description: task.description,
    status_name: task.status_id ? statusNameById.get(task.status_id) ?? null : null,
    section_name: task.section_id ? sectionNameById.get(task.section_id) ?? null : null,
    due_offset_days:
      baselineDueMs !== null && task.due_at
        ? toDayOffset(task.due_at, baselineDueMs)
        : null,
    sort_order: task.sort_order ?? index
  }));

  if (!templateTaskRows.length) {
    return;
  }

  const { error: taskInsertError } = await supabase
    .from('project_template_tasks')
    .insert(templateTaskRows);

  if (taskInsertError) {
    await supabase.from('project_templates').delete().eq('id', templateId);
    throw taskInsertError;
  }
}

async function getSourceProject(
  supabase: AppSupabaseClient,
  projectId: string
): Promise<SourceProjectRow> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, workspace_id, created_by')
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

async function canManageTemplateByUser(
  supabase: AppSupabaseClient,
  template: TemplateRow,
  userId: string
) {
  if (template.created_by === userId) {
    return true;
  }

  const workspaceRole = await getWorkspaceRole(
    supabase,
    template.workspace_id,
    userId
  );
  return workspaceRole === 'admin';
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

async function getTemplateSummaryById(
  supabase: AppSupabaseClient,
  templateId: string
): Promise<ProjectTemplateSummary> {
  const { data: template, error } = await supabase
    .from('project_templates')
    .select('id, workspace_id, name, include_tasks, created_by, created_at')
    .eq('id', templateId)
    .maybeSingle();

  if (error || !template) {
    throw error ?? new Error('Template not found.');
  }

  const [statusCount, sectionCount, taskCount] = await Promise.all([
    getTemplateRowCount(supabase, 'project_template_statuses', templateId),
    getTemplateRowCount(supabase, 'project_template_sections', templateId),
    getTemplateRowCount(supabase, 'project_template_tasks', templateId)
  ]);

  return {
    id: template.id,
    workspaceId: template.workspace_id,
    name: template.name,
    includeTasks: template.include_tasks,
    statusCount,
    sectionCount,
    taskCount,
    createdBy: template.created_by,
    createdAt: template.created_at
  };
}

async function getTemplateRowCount(
  supabase: AppSupabaseClient,
  table:
    | 'project_template_statuses'
    | 'project_template_sections'
    | 'project_template_tasks',
  templateId: string
) {
  const { data, error } = await supabase
    .from(table)
    .select('id')
    .eq('template_id', templateId);

  if (error) {
    throw error;
  }

  return (data ?? []).length;
}

async function getTemplateRow(
  supabase: AppSupabaseClient,
  templateId: string
): Promise<TemplateRow> {
  const { data, error } = await supabase
    .from('project_templates')
    .select('id, workspace_id, name, include_tasks, created_by, created_at')
    .eq('id', templateId)
    .maybeSingle();

  if (error || !data) {
    throw error ?? new Error('Template not found.');
  }

  return data as TemplateRow;
}

async function getTemplateStatuses(
  supabase: AppSupabaseClient,
  templateId: string
): Promise<TemplateStatusRow[]> {
  const { data, error } = await supabase
    .from('project_template_statuses')
    .select('name, color, is_done, sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as TemplateStatusRow[];
}

async function getTemplateSections(
  supabase: AppSupabaseClient,
  templateId: string
): Promise<TemplateSectionRow[]> {
  const { data, error } = await supabase
    .from('project_template_sections')
    .select('name, sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as TemplateSectionRow[];
}

async function getTemplateTasks(
  supabase: AppSupabaseClient,
  templateId: string
): Promise<TemplateTaskRow[]> {
  const { data, error } = await supabase
    .from('project_template_tasks')
    .select('title, description, status_name, section_name, due_offset_days, sort_order')
    .eq('template_id', templateId)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as TemplateTaskRow[];
}

function normalizeName(value: string) {
  return value.trim().toLowerCase();
}

function assertActor(actorUserId: string, userId: string) {
  if (actorUserId !== userId) {
    throw new Error('Actor user mismatch.');
  }
}

function isUniqueViolation(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return (error as { code?: unknown }).code === '23505';
}

function toUtcDayStartMilliseconds(value: string) {
  const date = new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function toDayOffset(value: string, baselineMs: number) {
  return Math.round(
    (toUtcDayStartMilliseconds(value) - baselineMs) / MILLISECONDS_PER_DAY
  );
}

function parseDueAnchorDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Due anchor date is invalid.');
  }
  return date;
}

function toIsoDueAtFromOffset(dueAnchor: Date, dayOffset: number) {
  return new Date(
    dueAnchor.getTime() + dayOffset * MILLISECONDS_PER_DAY
  ).toISOString();
}

function revalidateProjectPaths(projectId: string | null) {
  revalidatePath('/projects');
  revalidatePath('/my-tasks');
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }
}
