'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { normalizeEmail, sendWorkspaceInviteEmail } from '@/lib/domain/workspaces/invites';
import { getPendingWorkspaceInvites } from '@/lib/domain/workspaces/queries';
import {
  cancelWorkspaceInviteSchema,
  createWorkspaceInviteSchema,
  removeWorkspaceMemberSchema,
  updateWorkspaceMemberRoleSchema
} from '@/lib/validators/workspace';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { toErrorMessage } from '@/lib/utils';
import type { ActionResult } from '@/lib/actions/types';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';

type WorkspaceMemberMutationRow = {
  user_id: string;
  role: 'admin' | 'member';
};

type QueryableSupabaseClient = Pick<AppSupabaseClient, 'from'>;

export async function createWorkspaceInviteAction(input: {
  workspaceId: string;
  email: string;
  role: 'admin' | 'member';
}): Promise<ActionResult<{ inviteId: string }>> {
  try {
    const parsed = createWorkspaceInviteSchema.parse(input);
    const { user, supabase } = await requireUser();
    const normalizedEmail = normalizeEmail(parsed.email);

    const { data: workspace, error: workspaceError } = await supabase
      .from('workspaces')
      .select('id, name')
      .eq('id', parsed.workspaceId)
      .maybeSingle();

    if (workspaceError || !workspace) {
      throw workspaceError ?? new Error('Workspace not found.');
    }

    const pendingInvites = await getPendingWorkspaceInvites(supabase, parsed.workspaceId);
    if (pendingInvites.some((invite) => normalizeEmail(invite.email) === normalizedEmail)) {
      throw new Error('An active invite already exists for that email in this workspace.');
    }

    const { data: invite, error: inviteError } = await supabase
      .from('workspace_invites')
      .insert({
        workspace_id: parsed.workspaceId,
        email: normalizedEmail,
        role: parsed.role,
        invited_by: user.id
      })
      .select('id')
      .single();

    if (inviteError || !invite) {
      throw inviteError ?? new Error('Workspace invite could not be created.');
    }

    try {
      await sendWorkspaceInviteEmail({
        inviteId: invite.id,
        workspaceName: workspace.name,
        inviteEmail: normalizedEmail,
        inviterLabel: getInviterLabel(user.email, user.user_metadata)
      });
    } catch (emailError) {
      await supabase
        .from('workspace_invites')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', invite.id);
      throw emailError;
    }

    revalidateWorkspacePaths();

    return {
      ok: true,
      data: {
        inviteId: invite.id
      }
    };
  } catch (error) {
    return { ok: false, error: toWorkspaceErrorMessage(error) };
  }
}

export async function cancelWorkspaceInviteAction(input: {
  inviteId: string;
}): Promise<ActionResult<{ inviteId: string; workspaceId: string }>> {
  try {
    cancelWorkspaceInviteSchema.parse(input);
    const { supabase } = await requireUser();

    const { data: invite, error: inviteError } = await supabase
      .from('workspace_invites')
      .select('id, workspace_id, accepted_at, revoked_at')
      .eq('id', input.inviteId)
      .maybeSingle();

    if (inviteError || !invite) {
      throw inviteError ?? new Error('Invite not found.');
    }

    if (invite.accepted_at) {
      throw new Error('Accepted invites cannot be cancelled.');
    }

    if (invite.revoked_at) {
      throw new Error('Invite has already been cancelled.');
    }

    const { error: revokeError } = await supabase
      .from('workspace_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', input.inviteId);

    if (revokeError) {
      throw revokeError;
    }

    revalidateWorkspacePaths();

    return {
      ok: true,
      data: {
        inviteId: input.inviteId,
        workspaceId: invite.workspace_id
      }
    };
  } catch (error) {
    return { ok: false, error: toWorkspaceErrorMessage(error) };
  }
}

export async function updateWorkspaceMemberRoleAction(input: {
  workspaceId: string;
  userId: string;
  role: 'admin' | 'member';
}): Promise<ActionResult<{ workspaceId: string; userId: string }>> {
  try {
    const parsed = updateWorkspaceMemberRoleSchema.parse(input);
    const { supabase } = await requireUser();
    const members = await getWorkspaceMembersForMutation(supabase, parsed.workspaceId);
    const target = members.find((member) => member.user_id === parsed.userId);

    if (!target) {
      throw new Error('Workspace member not found.');
    }

    guardLastAdmin(members, target.user_id, parsed.role);

    const { error } = await supabase
      .from('workspace_members')
      .update({ role: parsed.role })
      .eq('workspace_id', parsed.workspaceId)
      .eq('user_id', parsed.userId);

    if (error) {
      throw error;
    }

    revalidateWorkspacePaths();

    return {
      ok: true,
      data: {
        workspaceId: parsed.workspaceId,
        userId: parsed.userId
      }
    };
  } catch (error) {
    return { ok: false, error: toWorkspaceErrorMessage(error) };
  }
}

export async function removeWorkspaceMemberAction(input: {
  workspaceId: string;
  userId: string;
}): Promise<ActionResult<{ workspaceId: string; userId: string }>> {
  try {
    const parsed = removeWorkspaceMemberSchema.parse(input);
    const { supabase } = await requireUser();
    const members = await getWorkspaceMembersForMutation(supabase, parsed.workspaceId);
    const target = members.find((member) => member.user_id === parsed.userId);

    if (!target) {
      throw new Error('Workspace member not found.');
    }

    guardLastAdmin(members, target.user_id, null);

    const adminSupabase = createSupabaseAdminClient();
    const projectIds = await getWorkspaceProjectIdsForCleanup(adminSupabase, parsed.workspaceId);
    if (projectIds.length) {
      await removeWorkspaceProjectAccess(adminSupabase, projectIds, parsed.userId);
    }

    const { error: membershipDeleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', parsed.workspaceId)
      .eq('user_id', parsed.userId);

    if (membershipDeleteError) {
      throw membershipDeleteError;
    }

    revalidateWorkspacePaths();

    return {
      ok: true,
      data: {
        workspaceId: parsed.workspaceId,
        userId: parsed.userId
      }
    };
  } catch (error) {
    return { ok: false, error: toWorkspaceErrorMessage(error) };
  }
}

async function getWorkspaceMembersForMutation(
  supabase: AppSupabaseClient,
  workspaceId: string
): Promise<WorkspaceMemberMutationRow[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('user_id, role')
    .eq('workspace_id', workspaceId);

  if (error) {
    throw error;
  }

  return (data ?? []) as WorkspaceMemberMutationRow[];
}

async function getWorkspaceProjectIdsForCleanup(
  supabase: QueryableSupabaseClient,
  workspaceId: string
) {
  const { data, error } = await supabase
    .from('projects')
    .select('id')
    .eq('workspace_id', workspaceId);

  if (error) {
    throw error;
  }

  return (data ?? []).map((project) => project.id);
}

async function removeWorkspaceProjectAccess(
  supabase: QueryableSupabaseClient,
  projectIds: string[],
  userId: string
) {
  const { error: unassignError } = await supabase
    .from('tasks')
    .update({
      assignee_id: null,
      updated_at: new Date().toISOString()
    })
    .in('project_id', projectIds)
    .eq('assignee_id', userId)
    .is('completed_at', null);

  if (unassignError) {
    throw unassignError;
  }

  const { error: projectMemberDeleteError } = await supabase
    .from('project_members')
    .delete()
    .eq('user_id', userId)
    .in('project_id', projectIds);

  if (projectMemberDeleteError) {
    throw projectMemberDeleteError;
  }
}

function guardLastAdmin(
  members: WorkspaceMemberMutationRow[],
  targetUserId: string,
  nextRole: 'admin' | 'member' | null
) {
  const adminMembers = members.filter((member) => member.role === 'admin');
  const target = members.find((member) => member.user_id === targetUserId);
  if (!target || target.role !== 'admin') {
    return;
  }

  if (nextRole === 'admin') {
    return;
  }

  if (adminMembers.length <= 1) {
    throw new Error('Workspace must keep at least one admin.');
  }
}

function getInviterLabel(email: string | undefined, userMetadata: { full_name?: unknown } | undefined) {
  if (typeof userMetadata?.full_name === 'string' && userMetadata.full_name.trim()) {
    return userMetadata.full_name.trim();
  }

  if (email?.trim()) {
    return email.trim();
  }

  return 'A teammate';
}

function revalidateWorkspacePaths() {
  revalidatePath('/projects');
  revalidatePath('/my-tasks');
}

function toWorkspaceErrorMessage(error: unknown) {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  ) {
    return 'An active invite already exists for that email in this workspace.';
  }

  return toErrorMessage(error);
}
