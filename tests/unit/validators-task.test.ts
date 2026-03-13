import { describe, expect, it } from 'vitest';
import {
  createCommentSchema,
  createTaskSchema,
  fetchBoardOrderStateSchema,
  moveTaskSchema,
  moveTaskWithConcurrencySchema,
  reorderBoardColumnSchema,
  updateTaskSchema
} from '@/lib/validators/task';

const uuid = '11111111-1111-4111-8111-111111111111';
const uuid2 = '22222222-2222-4222-8222-222222222222';
const uuid3 = '33333333-3333-4333-8333-333333333333';

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

  describe('moveTaskWithConcurrencySchema', () => {
    it('validates a valid concurrency move payload without actorUserId', () => {
      const result = moveTaskWithConcurrencySchema.safeParse({
        taskId: uuid,
        projectId: uuid2,
        fromStatusId: uuid,
        toStatusId: uuid2,
        targetIndex: 0,
        expectedLaneVersion: 0
      });

      expect(result.success).toBe(true);
    });

    it('rejects negative targetIndex', () => {
      const result = moveTaskWithConcurrencySchema.safeParse({
        taskId: uuid,
        projectId: uuid2,
        fromStatusId: uuid,
        toStatusId: uuid2,
        targetIndex: -1,
        expectedLaneVersion: 0
      });

      expect(result.success).toBe(false);
    });

    it('rejects non-integer targetIndex', () => {
      const result = moveTaskWithConcurrencySchema.safeParse({
        taskId: uuid,
        projectId: uuid2,
        fromStatusId: uuid,
        toStatusId: uuid2,
        targetIndex: 1.5,
        expectedLaneVersion: 0
      });

      expect(result.success).toBe(false);
    });

    it('does not require actorUserId', () => {
      const result = moveTaskWithConcurrencySchema.safeParse({
        taskId: uuid,
        projectId: uuid2,
        fromStatusId: uuid,
        toStatusId: uuid2,
        targetIndex: 0,
        expectedLaneVersion: 0,
        actorUserId: uuid3
      });

      // Extra fields are stripped by zod, but parse should still succeed
      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).actorUserId).toBeUndefined();
      }
    });
  });

  describe('reorderBoardColumnSchema', () => {
    it('validates a valid reorder payload without actorUserId', () => {
      const result = reorderBoardColumnSchema.safeParse({
        projectId: uuid,
        statusId: uuid2,
        orderedTaskIds: [uuid, uuid2],
        expectedLaneVersion: 1
      });

      expect(result.success).toBe(true);
    });

    it('rejects duplicate task IDs', () => {
      const result = reorderBoardColumnSchema.safeParse({
        projectId: uuid,
        statusId: uuid2,
        orderedTaskIds: [uuid, uuid],
        expectedLaneVersion: 1
      });

      expect(result.success).toBe(false);
    });

    it('does not require actorUserId', () => {
      const result = reorderBoardColumnSchema.safeParse({
        projectId: uuid,
        statusId: uuid2,
        orderedTaskIds: [uuid],
        expectedLaneVersion: 0,
        actorUserId: uuid3
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect((result.data as Record<string, unknown>).actorUserId).toBeUndefined();
      }
    });
  });

  describe('fetchBoardOrderStateSchema', () => {
    it('validates with only projectId', () => {
      const result = fetchBoardOrderStateSchema.safeParse({
        projectId: uuid
      });

      expect(result.success).toBe(true);
    });

    it('validates with projectId and optional statusId', () => {
      const result = fetchBoardOrderStateSchema.safeParse({
        projectId: uuid,
        statusId: uuid2
      });

      expect(result.success).toBe(true);
    });

    it('rejects non-uuid projectId', () => {
      const result = fetchBoardOrderStateSchema.safeParse({
        projectId: 'not-a-uuid'
      });

      expect(result.success).toBe(false);
    });
  });
});
