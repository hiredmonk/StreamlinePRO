import {
  getPendingWorkspaceInvites,
  getWorkspaceMembers,
  type WorkspaceInviteRecord,
  type WorkspaceMemberRecord
} from '@/lib/domain/workspaces/queries';
import { getUserProfileMap } from '@/lib/domain/users/profiles';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';

export type WorkspaceMemberSummary = {
  userId: string;
  role: 'admin' | 'member';
  createdAt: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
};

export type PendingWorkspaceInviteSummary = {
  id: string;
  email: string;
  role: 'admin' | 'member';
  createdAt: string;
};

export type WorkspaceTeamAccessData = {
  members: WorkspaceMemberSummary[];
  pendingInvites: PendingWorkspaceInviteSummary[];
};

export async function loadWorkspaceTeamAccessData(
  supabase: AppSupabaseClient,
  workspaceId: string
): Promise<WorkspaceTeamAccessData> {
  const [memberRows, pendingInvites] = await Promise.all([
    getWorkspaceMembers(supabase, workspaceId),
    getPendingWorkspaceInvites(supabase, workspaceId)
  ]);
  const profileMap = await getUserProfileMap(memberRows.map((member) => member.user_id));

  return {
    members: memberRows
      .map((member) => mapWorkspaceMember(member, profileMap))
      .sort((a, b) => `${a.displayName} ${a.email}`.localeCompare(`${b.displayName} ${b.email}`)),
    pendingInvites: pendingInvites.map(mapPendingInvite)
  };
}

function mapWorkspaceMember(
  member: WorkspaceMemberRecord,
  profileMap: Awaited<ReturnType<typeof getUserProfileMap>>
): WorkspaceMemberSummary {
  const profile = profileMap[member.user_id];

  return {
    userId: member.user_id,
    role: member.role,
    createdAt: member.created_at,
    email: profile?.email ?? '',
    displayName: profile?.displayName ?? 'Unknown member',
    avatarUrl: profile?.avatarUrl ?? null,
    initials: profile?.initials ?? 'UM'
  };
}

function mapPendingInvite(invite: WorkspaceInviteRecord): PendingWorkspaceInviteSummary {
  return {
    id: invite.id,
    email: invite.email,
    role: invite.role,
    createdAt: invite.created_at
  };
}
