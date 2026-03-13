import { z } from 'zod';

export const projectPrivacySchema = z.enum(['workspace_visible', 'private']);
const templateNameSchema = z
  .string()
  .trim()
  .min(2, 'Template name should have at least 2 characters.')
  .max(100, 'Template name should stay below 100 characters.');
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
  privacy: projectPrivacySchema.default('workspace_visible'),
  templateId: z.uuid().nullable().optional()
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

export const saveProjectTemplateSchema = z.object({
  projectId: z.uuid(),
  name: templateNameSchema,
  description: z.string().max(2000).optional(),
  includeTasks: z.boolean()
});
