'use server';

import { randomUUID } from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { createProjectSchema, createWorkspaceSchema } from '@/lib/validators/project';
import { DEFAULT_PROJECT_SECTIONS, DEFAULT_PROJECT_STATUSES } from '@/lib/constants/status-colors';
import { toErrorMessage } from '@/lib/utils';
import type { ActionResult } from '@/lib/actions/types';

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

    const { data: project, error } = await supabase
      .from('projects')
      .insert({
        workspace_id: parsed.workspaceId,
        name: parsed.name,
        description: parsed.description ?? null,
        privacy: parsed.privacy,
        created_by: user.id
      })
      .select('id')
      .single();

    if (error || !project) {
      throw error ?? new Error('Project was not created.');
    }

    const { error: memberError } = await supabase.from('project_members').insert({
      project_id: project.id,
      user_id: user.id,
      role: 'editor'
    });

    if (memberError) {
      throw memberError;
    }

    const { error: statusesError } = await supabase.from('project_statuses').insert(
      DEFAULT_PROJECT_STATUSES.map((status, index) => ({
        project_id: project.id,
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
        project_id: project.id,
        name,
        sort_order: index
      }))
    );

    if (sectionsError) {
      throw sectionsError;
    }

    revalidatePath('/projects');
    revalidatePath(`/projects/${project.id}`);

    return { ok: true, data: { projectId: project.id } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
