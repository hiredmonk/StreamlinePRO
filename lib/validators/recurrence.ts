import { z } from 'zod';

export const recurrenceFrequencySchema = z.enum(['daily', 'weekly', 'monthly']);

export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>;

export const createTaskRecurrenceSchema = z.object({
  taskId: z.uuid(),
  frequency: recurrenceFrequencySchema,
  interval: z.number().int().min(1).max(365)
});

export const updateTaskRecurrenceSchema = z.object({
  taskId: z.uuid(),
  recurrenceId: z.uuid(),
  frequency: recurrenceFrequencySchema,
  interval: z.number().int().min(1).max(365)
});

export const pauseTaskRecurrenceSchema = z.object({
  taskId: z.uuid(),
  recurrenceId: z.uuid()
});

export const resumeTaskRecurrenceSchema = z.object({
  taskId: z.uuid(),
  recurrenceId: z.uuid()
});

export const clearTaskRecurrenceSchema = z.object({
  taskId: z.uuid(),
  recurrenceId: z.uuid()
});
