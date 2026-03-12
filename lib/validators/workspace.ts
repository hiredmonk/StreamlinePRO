import { z } from 'zod';

export const workspaceRoleSchema = z.enum(['admin', 'member']);

export const createWorkspaceInviteSchema = z.object({
  workspaceId: z.uuid(),
  email: z.string().trim().email(),
  role: workspaceRoleSchema.default('member')
});

export const cancelWorkspaceInviteSchema = z.object({
  inviteId: z.uuid()
});

export const updateWorkspaceMemberRoleSchema = z.object({
  workspaceId: z.uuid(),
  userId: z.uuid(),
  role: workspaceRoleSchema
});

export const removeWorkspaceMemberSchema = z.object({
  workspaceId: z.uuid(),
  userId: z.uuid()
});
