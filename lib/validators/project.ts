import { z } from 'zod';

export const projectPrivacySchema = z.enum(['workspace_visible', 'private']);

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
    .min(2, 'Workspace name should have at least 2 characters.')
    .max(80, 'Workspace name should stay below 80 characters.'),
  icon: z.string().max(12).optional()
});
