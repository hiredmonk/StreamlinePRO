import { z } from 'zod';

export const recurrenceFrequencySchema = z.enum(['daily', 'weekly', 'monthly']);
export const recurrenceModeSchema = z.enum(['create_on_complete', 'create_on_schedule']);

export const recurrencePatternSchema = z.object({
  frequency: recurrenceFrequencySchema,
  interval: z
    .number()
    .int()
    .min(1, 'Recurrence interval must be at least 1.')
    .max(365, 'Recurrence interval must be 365 or less.')
});

export const createRecurrenceSchema = z.object({
  workspaceId: z.uuid(),
  taskId: z.uuid(),
  pattern: recurrencePatternSchema,
  mode: recurrenceModeSchema,
  anchorDueAt: z.string().datetime().nullable().optional(),
  actorUserId: z.uuid()
});

export const updateRecurrenceSchema = z
  .object({
    recurrenceId: z.uuid(),
    pattern: recurrencePatternSchema.optional(),
    mode: recurrenceModeSchema.optional(),
    actorUserId: z.uuid()
  })
  .refine((input) => input.pattern !== undefined || input.mode !== undefined, {
    message: 'Provide at least one recurrence field to update.'
  });

export const pauseRecurrenceSchema = z.object({
  recurrenceId: z.uuid(),
  actorUserId: z.uuid(),
  reason: z.string().max(500).optional()
});

export const resumeRecurrenceSchema = z.object({
  recurrenceId: z.uuid(),
  actorUserId: z.uuid()
});

export const listRecurrencesSchema = z.object({
  workspaceId: z.uuid(),
  includePaused: z.boolean().optional()
});
