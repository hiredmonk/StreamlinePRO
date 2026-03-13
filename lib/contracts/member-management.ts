import type { ActionResult } from '@/lib/actions/types';

export type WorkspaceRole = 'admin' | 'member';

export interface InviteWorkspaceMemberInput {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedByUserId: string;
}

export interface InviteWorkspaceMemberOutput {
  workspaceId: string;
  memberUserId: string;
  role: WorkspaceRole;
  invitedAt: string;
}

export interface UpdateWorkspaceMemberRoleInput {
  workspaceId: string;
  memberUserId: string;
  nextRole: WorkspaceRole;
  actorUserId: string;
}

export interface UpdateWorkspaceMemberRoleOutput {
  workspaceId: string;
  memberUserId: string;
  previousRole: WorkspaceRole;
  nextRole: WorkspaceRole;
  updatedAt: string;
}

export interface RemoveWorkspaceMemberInput {
  workspaceId: string;
  memberUserId: string;
  actorUserId: string;
  reason?: string;
}

export interface RemoveWorkspaceMemberOutput {
  workspaceId: string;
  removedUserId: string;
  removedAt: string;
}

export interface ListWorkspaceMembersInput {
  workspaceId: string;
  actorUserId: string;
}

export interface WorkspaceMemberSummary {
  workspaceId: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface ListWorkspaceMembersOutput {
  workspaceId: string;
  members: WorkspaceMemberSummary[];
}

export type InviteWorkspaceMemberAction = (
  input: InviteWorkspaceMemberInput
) => Promise<ActionResult<InviteWorkspaceMemberOutput>>;

export type UpdateWorkspaceMemberRoleAction = (
  input: UpdateWorkspaceMemberRoleInput
) => Promise<ActionResult<UpdateWorkspaceMemberRoleOutput>>;

export type RemoveWorkspaceMemberAction = (
  input: RemoveWorkspaceMemberInput
) => Promise<ActionResult<RemoveWorkspaceMemberOutput>>;

export type ListWorkspaceMembersQuery = (
  input: ListWorkspaceMembersInput
) => Promise<ListWorkspaceMembersOutput>;
