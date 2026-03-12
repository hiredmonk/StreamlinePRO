import { z } from 'zod';

export const workspaceRoleSchema = z.enum(['admin', 'member']);
export const workspaceInviteIdSchema = z.uuid();

export const createWorkspaceSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Workspace name should have at least 2 characters.')
    .max(80, 'Workspace name should stay below 80 characters.'),
  icon: z.string().trim().max(12).optional()
});

export const createWorkspaceInviteSchema = z.object({
  workspaceId: z.uuid(),
  email: z.string().trim().email('Enter a valid email address.'),
  role: workspaceRoleSchema.default('member')
});

export const cancelWorkspaceInviteSchema = z.object({
  inviteId: workspaceInviteIdSchema
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
