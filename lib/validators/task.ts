import { z } from 'zod';

export const taskPrioritySchema = z.enum(['low', 'medium', 'high']);

export const createTaskSchema = z.object({
  projectId: z.uuid(),
  sectionId: z.uuid().nullable().optional(),
  statusId: z.uuid(),
  title: z
    .string()
    .min(1, 'Task title is required.')
    .max(160, 'Task title should stay below 160 characters.'),
  description: z.string().max(8000).optional(),
  assigneeId: z.uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  dueTimezone: z.string().nullable().optional(),
  priority: taskPrioritySchema.nullable().optional(),
  parentTaskId: z.uuid().nullable().optional(),
  recurrenceId: z.uuid().nullable().optional(),
  isToday: z.boolean().optional()
});

export const updateTaskSchema = z.object({
  id: z.uuid(),
  title: z.string().max(160).optional(),
  description: z.string().max(8000).optional(),
  assigneeId: z.uuid().nullable().optional(),
  dueAt: z.string().datetime().nullable().optional(),
  dueTimezone: z.string().nullable().optional(),
  statusId: z.uuid().optional(),
  sectionId: z.uuid().nullable().optional(),
  priority: taskPrioritySchema.nullable().optional(),
  isToday: z.boolean().optional(),
  completedAt: z.string().datetime().nullable().optional(),
  sortOrder: z.number().min(0).optional()
});

export const completeTaskSchema = z.object({
  id: z.uuid()
});

export const moveTaskSchema = z.object({
  id: z.uuid(),
  statusId: z.uuid(),
  sectionId: z.uuid().nullable().optional(),
  sortOrder: z.number().min(0)
});

export const createCommentSchema = z.object({
  taskId: z.uuid(),
  body: z.string().min(1).max(2000)
});
