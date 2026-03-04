import { z } from 'zod';

export const workspaceRoleSchema = z.enum(['admin', 'member']);

export const inviteWorkspaceMemberSchema = z.object({
  workspaceId: z.uuid(),
  email: z.string().trim().email('Provide a valid email address.'),
  role: workspaceRoleSchema,
  invitedByUserId: z.uuid()
});

export const updateWorkspaceMemberRoleSchema = z.object({
  workspaceId: z.uuid(),
  memberUserId: z.uuid(),
  nextRole: workspaceRoleSchema,
  actorUserId: z.uuid()
});

export const removeWorkspaceMemberSchema = z.object({
  workspaceId: z.uuid(),
  memberUserId: z.uuid(),
  actorUserId: z.uuid(),
  reason: z.string().trim().min(1).max(300).optional()
});

export const listWorkspaceMembersSchema = z.object({
  workspaceId: z.uuid(),
  actorUserId: z.uuid()
});
