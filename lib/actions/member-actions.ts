'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { toErrorMessage } from '@/lib/utils';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import {
  inviteWorkspaceMemberSchema,
  listWorkspaceMembersSchema,
  removeWorkspaceMemberSchema,
  updateWorkspaceMemberRoleSchema
} from '@/lib/validators/member-management';
import type {
  InviteWorkspaceMemberAction,
  ListWorkspaceMembersOutput,
  ListWorkspaceMembersQuery,
  RemoveWorkspaceMemberAction,
  UpdateWorkspaceMemberRoleAction,
  WorkspaceRole
} from '@/lib/contracts/member-management';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';

type QueryableSupabaseClient = Pick<AppSupabaseClient, 'from'>;

type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  created_at: string;
};

type AuthUserLike = {
  id?: string;
  email?: string | null;
};

const AUTH_USERS_PAGE_SIZE = 200;
const AUTH_USERS_MAX_PAGES = 200;

export const inviteWorkspaceMemberAction: InviteWorkspaceMemberAction = async (input) => {
  try {
    const parsed = inviteWorkspaceMemberSchema.parse({
      ...input,
      email: normalizeEmail(input.email)
    });

    const { user, supabase } = await requireUser();
    assertActorMatchesAuthenticatedUser(parsed.invitedByUserId, user.id);
    await requireWorkspaceAdmin(supabase, parsed.workspaceId, parsed.invitedByUserId);

    const adminSupabase = createSupabaseAdminClient();
    const invitedUser = await findAuthUserByEmail(adminSupabase, parsed.email);
    if (!invitedUser) {
      throw new Error('No account exists for this email address.');
    }

    const existingMembership = await getWorkspaceMember(
      supabase,
      parsed.workspaceId,
      invitedUser.id
    );
    if (existingMembership) {
      throw new Error('User is already a workspace member.');
    }

    const invitedAt = new Date().toISOString();
    const { error } = await supabase.from('workspace_members').insert({
      workspace_id: parsed.workspaceId,
      user_id: invitedUser.id,
      role: parsed.role,
      created_at: invitedAt
    });

    if (error) {
      throw error;
    }

    revalidateWorkspacePaths();

    return {
      ok: true,
      data: {
        workspaceId: parsed.workspaceId,
        memberUserId: invitedUser.id,
        role: parsed.role,
        invitedAt
      }
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
};

export const updateWorkspaceMemberRoleAction: UpdateWorkspaceMemberRoleAction = async (input) => {
  try {
    const parsed = updateWorkspaceMemberRoleSchema.parse(input);
    const { user, supabase } = await requireUser();
    assertActorMatchesAuthenticatedUser(parsed.actorUserId, user.id);
    await requireWorkspaceAdmin(supabase, parsed.workspaceId, parsed.actorUserId);

    const targetMembership = await getWorkspaceMember(
      supabase,
      parsed.workspaceId,
      parsed.memberUserId
    );

    if (!targetMembership) {
      throw new Error('Workspace member not found.');
    }

    if (targetMembership.role === parsed.nextRole) {
      throw new Error('Member already has this role.');
    }

    if (targetMembership.role === 'admin' && parsed.nextRole !== 'admin') {
      await assertWorkspaceHasAnotherAdmin(
        supabase,
        parsed.workspaceId,
        targetMembership.user_id
      );
    }

    const updatedAt = new Date().toISOString();
    const { data: updatedRows, error } = await supabase
      .from('workspace_members')
      .update({ role: parsed.nextRole })
      .eq('workspace_id', parsed.workspaceId)
      .eq('user_id', parsed.memberUserId)
      .eq('role', targetMembership.role)
      .select('workspace_id')
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!updatedRows) {
      throw new Error('Member role changed concurrently. Please refresh and retry.');
    }

    revalidateWorkspacePaths();

    return {
      ok: true,
      data: {
        workspaceId: parsed.workspaceId,
        memberUserId: parsed.memberUserId,
        previousRole: targetMembership.role,
        nextRole: parsed.nextRole,
        updatedAt
      }
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
};

export const removeWorkspaceMemberAction: RemoveWorkspaceMemberAction = async (input) => {
  try {
    const parsed = removeWorkspaceMemberSchema.parse(input);
    const { user, supabase } = await requireUser();
    assertActorMatchesAuthenticatedUser(parsed.actorUserId, user.id);
    await requireWorkspaceAdmin(supabase, parsed.workspaceId, parsed.actorUserId);

    const targetMembership = await getWorkspaceMember(
      supabase,
      parsed.workspaceId,
      parsed.memberUserId
    );

    if (!targetMembership) {
      throw new Error('Workspace member not found.');
    }

    if (targetMembership.role === 'admin') {
      await assertWorkspaceHasAnotherAdmin(
        supabase,
        parsed.workspaceId,
        parsed.memberUserId
      );
    }

    const adminSupabase = createSupabaseAdminClient();
    const workspaceProjectIds = await getWorkspaceProjectIds(adminSupabase, parsed.workspaceId);
    if (workspaceProjectIds.length) {
      await removeWorkspaceProjectAccess(adminSupabase, workspaceProjectIds, parsed.memberUserId);
    }

    const { error: workspaceMemberDeleteError } = await supabase
      .from('workspace_members')
      .delete()
      .eq('workspace_id', parsed.workspaceId)
      .eq('user_id', parsed.memberUserId);

    if (workspaceMemberDeleteError) {
      throw workspaceMemberDeleteError;
    }

    const removedAt = new Date().toISOString();
    revalidateWorkspacePaths(workspaceProjectIds);

    return {
      ok: true,
      data: {
        workspaceId: parsed.workspaceId,
        removedUserId: parsed.memberUserId,
        removedAt
      }
    };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
};

export const listWorkspaceMembersQuery: ListWorkspaceMembersQuery = async (
  input
): Promise<ListWorkspaceMembersOutput> => {
  const parsed = listWorkspaceMembersSchema.parse(input);
  const { user, supabase } = await requireUser();
  assertActorMatchesAuthenticatedUser(parsed.actorUserId, user.id);
  await requireWorkspaceMember(supabase, parsed.workspaceId, parsed.actorUserId);

  const { data: memberRows, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, user_id, role, created_at')
    .eq('workspace_id', parsed.workspaceId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const members = (memberRows ?? []) as WorkspaceMemberRow[];
  const uniqueUserIds = Array.from(new Set(members.map((member) => member.user_id)));
  const emailByUserId = await mapUserEmailsByUserId(uniqueUserIds);

  return {
    workspaceId: parsed.workspaceId,
    members: members.map((member) => ({
      workspaceId: member.workspace_id,
      userId: member.user_id,
      email: emailByUserId.get(member.user_id) ?? 'unknown@example.com',
      role: member.role,
      joinedAt: member.created_at
    }))
  };
};

async function requireWorkspaceAdmin(
  supabase: AppSupabaseClient,
  workspaceId: string,
  userId: string
) {
  const membership = await getWorkspaceMember(supabase, workspaceId, userId);
  if (!membership || membership.role !== 'admin') {
    throw new Error('Only workspace admins can manage members.');
  }
}

async function requireWorkspaceMember(
  supabase: AppSupabaseClient,
  workspaceId: string,
  userId: string
) {
  const membership = await getWorkspaceMember(supabase, workspaceId, userId);
  if (!membership) {
    throw new Error('Only workspace members can view workspace members.');
  }
}

async function getWorkspaceMember(
  supabase: AppSupabaseClient,
  workspaceId: string,
  userId: string
): Promise<WorkspaceMemberRow | null> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, user_id, role, created_at')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as WorkspaceMemberRow | null) ?? null;
}

async function assertWorkspaceHasAnotherAdmin(
  supabase: AppSupabaseClient,
  workspaceId: string,
  excludedAdminUserId: string
) {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspaceId)
    .eq('role', 'admin');

  if (error) {
    throw error;
  }

  const hasAnotherAdmin = (data ?? []).some((member) => member.user_id !== excludedAdminUserId);
  if (!hasAnotherAdmin) {
    throw new Error('Cannot remove or demote the last workspace admin.');
  }
}

async function getWorkspaceProjectIds(supabase: QueryableSupabaseClient, workspaceId: string) {
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

function assertActorMatchesAuthenticatedUser(actorUserId: string, authUserId: string) {
  if (actorUserId !== authUserId) {
    throw new Error('Actor does not match the authenticated user.');
  }
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function revalidateWorkspacePaths(workspaceProjectIds: string[] = []) {
  revalidatePath('/projects');
  revalidatePath('/my-tasks');
  revalidatePath('/inbox');

  for (const projectId of workspaceProjectIds) {
    revalidatePath(`/projects/${projectId}`);
  }
}

export async function findAuthUserByEmail(
  adminSupabase: ReturnType<typeof createSupabaseAdminClient>,
  email: string
) {
  const targetEmail = normalizeEmail(email);

  for (let page = 1; page <= AUTH_USERS_MAX_PAGES; page += 1) {
    const users = await listAuthUsersPage(adminSupabase, page);
    if (!users.length) {
      break;
    }

    const matchingUser = users.find(
      (candidate) => normalizeEmail(String(candidate.email ?? '')) === targetEmail
    );

    if (matchingUser && typeof matchingUser.id === 'string') {
      return { id: matchingUser.id, email: matchingUser.email ?? null };
    }

    if (users.length < AUTH_USERS_PAGE_SIZE) {
      break;
    }
  }

  return null;
}

async function mapUserEmailsByUserId(userIds: string[]) {
  const emailByUserId = new Map<string, string>();

  if (!userIds.length) {
    return emailByUserId;
  }

  const remainingUserIds = new Set(userIds);
  const adminSupabase = createSupabaseAdminClient();

  for (let page = 1; page <= AUTH_USERS_MAX_PAGES && remainingUserIds.size > 0; page += 1) {
    const users = await listAuthUsersPage(adminSupabase, page);
    if (!users.length) {
      break;
    }

    for (const candidate of users) {
      if (typeof candidate.id !== 'string' || !remainingUserIds.has(candidate.id)) {
        continue;
      }

      emailByUserId.set(candidate.id, candidate.email ?? 'unknown@example.com');
      remainingUserIds.delete(candidate.id);
    }

    if (users.length < AUTH_USERS_PAGE_SIZE) {
      break;
    }
  }

  for (const missingUserId of remainingUserIds) {
    emailByUserId.set(missingUserId, 'unknown@example.com');
  }

  return emailByUserId;
}

async function listAuthUsersPage(
  adminSupabase: ReturnType<typeof createSupabaseAdminClient>,
  page: number
) {
  const { data, error } = await adminSupabase.auth.admin.listUsers({
    page,
    perPage: AUTH_USERS_PAGE_SIZE
  });

  if (error) {
    throw error;
  }

  if (
    data &&
    typeof data === 'object' &&
    Array.isArray((data as { users?: AuthUserLike[] }).users)
  ) {
    return (data as { users: AuthUserLike[] }).users;
  }

  return [];
}
