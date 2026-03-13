import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { getClientEnv, getServerEnv } from '@/lib/env';

type InviteRow = {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'member';
  accepted_at: string | null;
  accepted_user_id: string | null;
  revoked_at: string | null;
  workspace: {
    id: string;
    name: string;
  } | null;
};

export type WorkspaceInviteContext = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  email: string;
  role: 'admin' | 'member';
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function getWorkspaceInviteContext(inviteId: string): Promise<WorkspaceInviteContext | null> {
  const supabase = createSupabaseAdminClient();
  const invite = await getInviteRow(supabase, inviteId);
  if (!invite || invite.accepted_at || invite.revoked_at || !invite.workspace) {
    return null;
  }

  return {
    id: invite.id,
    workspaceId: invite.workspace_id,
    workspaceName: invite.workspace.name,
    email: invite.email,
    role: invite.role
  };
}

export async function acceptWorkspaceInvite(input: {
  inviteId: string;
  userId: string;
  email: string;
}) {
  const supabase = createSupabaseAdminClient();
  const invite = await getInviteRow(supabase, input.inviteId);

  if (!invite || !invite.workspace) {
    throw new Error('This workspace invite is no longer valid.');
  }

  if (invite.revoked_at) {
    throw new Error('This workspace invite has already been cancelled.');
  }

  if (invite.accepted_at) {
    if (invite.accepted_user_id === input.userId) {
      return {
        workspaceId: invite.workspace_id
      };
    }

    throw new Error('This workspace invite has already been accepted.');
  }

  if (normalizeEmail(invite.email) !== normalizeEmail(input.email)) {
    throw new Error('Sign in with the invited email address to join this workspace.');
  }

  const { data: existingMembership, error: membershipLookupError } = await supabase
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', invite.workspace_id)
    .eq('user_id', input.userId)
    .maybeSingle();

  if (membershipLookupError) {
    throw membershipLookupError;
  }

  if (!existingMembership) {
    const { error: membershipInsertError } = await supabase.from('workspace_members').insert({
      workspace_id: invite.workspace_id,
      user_id: input.userId,
      role: invite.role
    });

    if (membershipInsertError) {
      throw membershipInsertError;
    }
  }

  const acceptedAt = new Date().toISOString();
  const { error: inviteUpdateError } = await supabase
    .from('workspace_invites')
    .update({
      accepted_at: acceptedAt,
      accepted_user_id: input.userId
    })
    .eq('id', invite.id);

  if (inviteUpdateError) {
    throw inviteUpdateError;
  }

  return {
    workspaceId: invite.workspace_id
  };
}

export async function sendWorkspaceInviteEmail(input: {
  inviteId: string;
  workspaceName: string;
  inviteEmail: string;
  inviterLabel: string;
}) {
  const env = getServerEnv();
  const clientEnv = getClientEnv();
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${env.EMAIL_PROVIDER_API_KEY}`,
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM_ADDRESS,
      to: [input.inviteEmail],
      subject: `${input.inviterLabel} invited you to ${input.workspaceName}`,
      text: buildInviteTextBody(clientEnv.NEXT_PUBLIC_APP_URL, input),
      html: undefined
    })
  });

  if (!response.ok) {
    const json = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(
      typeof json.message === 'string' && json.message.trim()
        ? json.message
        : 'Workspace invite email could not be sent.'
    );
  }
}

function buildInviteTextBody(appUrl: string, input: { inviteId: string; workspaceName: string; inviterLabel: string }) {
  return `${input.inviterLabel} invited you to join the ${input.workspaceName} workspace in StreamlinePRO.\n\nOpen this link and continue with Google using the invited email address:\n${appUrl}/signin?workspaceInvite=${input.inviteId}\n`;
}

async function getInviteRow(supabase: ReturnType<typeof createSupabaseAdminClient>, inviteId: string) {
  const { data, error } = await supabase
    .from('workspace_invites')
    .select(
      `
      id,
      workspace_id,
      email,
      role,
      accepted_at,
      accepted_user_id,
      revoked_at,
      workspace:workspaces (
        id,
        name
      )
    `
    )
    .eq('id', inviteId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const workspace = Array.isArray(data.workspace) ? data.workspace[0] : data.workspace;
  return {
    ...(data as Omit<InviteRow, 'workspace'>),
    workspace
  } as InviteRow;
}
