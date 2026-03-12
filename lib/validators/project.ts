import { z } from 'zod';

export const projectPrivacySchema = z.enum(['workspace_visible', 'private']);
export const workspaceRoleSchema = z.enum(['admin', 'member']);
const statusNameSchema = z
  .string()
  .trim()
  .min(1, 'Status name is required.')
  .max(80, 'Status name should stay below 80 characters.');
const statusColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Status color must be a 6-digit hex value like #1b7f4b.');

export const createProjectSchema = z.object({
  workspaceId: z.uuid(),
  name: z
    .string()
    .min(2, 'Project name should have at least 2 characters.')
    .max(100, 'Project name should stay below 100 characters.'),
  description: z.string().max(2000).optional(),
  privacy: projectPrivacySchema.default('workspace_visible')
});

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

export const createProjectStatusSchema = z.object({
  projectId: z.uuid(),
  name: statusNameSchema,
  color: statusColorSchema.optional(),
  isDone: z.boolean().optional()
});

export const updateProjectStatusSchema = z
  .object({
    id: z.uuid(),
    name: statusNameSchema.optional(),
    color: statusColorSchema.optional(),
    isDone: z.boolean().optional()
  })
  .refine(
    (value) =>
      value.name !== undefined || value.color !== undefined || value.isDone !== undefined,
    { message: 'Provide at least one field to update.', path: ['id'] }
  );

export const reorderProjectStatusesSchema = z
  .object({
    projectId: z.uuid(),
    orderedStatusIds: z.array(z.uuid()).min(1, 'At least one status is required.')
  })
  .refine(
    (value) => new Set(value.orderedStatusIds).size === value.orderedStatusIds.length,
    {
      message: 'Status order contains duplicates.',
      path: ['orderedStatusIds']
    }
  );

export const deleteProjectStatusSchema = z
  .object({
    id: z.uuid(),
    fallbackStatusId: z.uuid()
  })
  .refine((value) => value.id !== value.fallbackStatusId, {
    message: 'Fallback status must be different from the status being deleted.',
    path: ['fallbackStatusId']
  });
