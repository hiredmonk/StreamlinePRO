import type { AppSupabaseClient } from '@/lib/supabase/client-types';

export type WorkspaceMemberRecord = {
  workspace_id: string;
  user_id: string;
  role: 'admin' | 'member';
  created_at: string;
};

export type WorkspaceInviteRecord = {
  id: string;
  workspace_id: string;
  email: string;
  role: 'admin' | 'member';
  invited_by: string;
  created_at: string;
};

export async function getWorkspaceMembers(
  supabase: AppSupabaseClient,
  workspaceId: string
): Promise<WorkspaceMemberRecord[]> {
  const { data, error } = await supabase
    .from('workspace_members')
    .select('workspace_id, user_id, role, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as WorkspaceMemberRecord[];
}

export async function getPendingWorkspaceInvites(
  supabase: AppSupabaseClient,
  workspaceId: string
): Promise<WorkspaceInviteRecord[]> {
  const { data, error } = await supabase
    .from('workspace_invites')
    .select('id, workspace_id, email, role, invited_by, created_at')
    .eq('workspace_id', workspaceId)
    .is('accepted_at', null)
    .is('revoked_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return (data ?? []) as WorkspaceInviteRecord[];
}
