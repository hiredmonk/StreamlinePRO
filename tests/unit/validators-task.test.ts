import { describe, expect, it } from 'vitest';
import {
  createCommentSchema,
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema
} from '@/lib/validators/task';

const uuid = '11111111-1111-4111-8111-111111111111';
const uuid2 = '22222222-2222-4222-8222-222222222222';

describe('task validators', () => {
  it('validates create task payload', () => {
    const parsed = createTaskSchema.parse({
      projectId: uuid,
      statusId: uuid2,
      title: 'Ship dashboard',
      dueAt: '2026-02-15T12:00:00.000Z',
      priority: 'medium'
    });

    expect(parsed.title).toBe('Ship dashboard');
    expect(parsed.priority).toBe('medium');
  });

  it('rejects empty create task title', () => {
    const result = createTaskSchema.safeParse({
      projectId: uuid,
      statusId: uuid2,
      title: ''
    });

    expect(result.success).toBe(false);
  });

  it('validates update sort order and move payload', () => {
    expect(
      updateTaskSchema.safeParse({
        id: uuid,
        sortOrder: 3
      }).success
    ).toBe(true);

    expect(
      moveTaskSchema.safeParse({
        id: uuid,
        statusId: uuid2,
        sortOrder: 0
      }).success
    ).toBe(true);
  });

  it('rejects empty comment bodies', () => {
    const result = createCommentSchema.safeParse({
      taskId: uuid,
      body: ''
    });

    expect(result.success).toBe(false);
  });
});
