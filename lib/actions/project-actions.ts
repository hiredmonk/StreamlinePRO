'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import {
  createProjectSchema,
  createProjectStatusSchema,
  deleteProjectStatusSchema,
  reorderProjectStatusesSchema,
  updateProjectStatusSchema
} from '@/lib/validators/project';
import { createWorkspaceSchema } from '@/lib/validators/workspace';
import { DEFAULT_PROJECT_SECTIONS, DEFAULT_PROJECT_STATUSES } from '@/lib/constants/status-colors';
import { toErrorMessage } from '@/lib/utils';
import type { ActionResult } from '@/lib/actions/types';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';

type ProjectStatusRow = {
  id: string;
  project_id: string;
  name: string;
  color: string;
  is_done: boolean;
  sort_order: number;
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
