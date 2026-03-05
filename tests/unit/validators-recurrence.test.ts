import { describe, expect, it } from 'vitest';
import {
  createRecurrenceSchema,
  pauseRecurrenceSchema,
  resumeRecurrenceSchema,
  updateRecurrenceSchema
} from '@/lib/validators/recurrence';

const uuid = '11111111-1111-4111-8111-111111111111';
const uuid2 = '22222222-2222-4222-8222-222222222222';

describe('recurrence validators', () => {
  it('validates recurrence creation payload', () => {
    const parsed = createRecurrenceSchema.parse({
      workspaceId: uuid,
      taskId: uuid2,
      pattern: { frequency: 'weekly', interval: 2 },
      mode: 'create_on_complete',
      anchorDueAt: '2026-03-04T10:00:00.000Z',
      actorUserId: uuid
    });

    expect(parsed.pattern.interval).toBe(2);
    expect(parsed.mode).toBe('create_on_complete');
  });

  it('rejects invalid interval', () => {
    const result = createRecurrenceSchema.safeParse({
      workspaceId: uuid,
      taskId: uuid2,
      pattern: { frequency: 'weekly', interval: 0 },
      mode: 'create_on_complete',
      actorUserId: uuid
    });

    expect(result.success).toBe(false);
  });

  it('requires an editable field in update payload', () => {
    const result = updateRecurrenceSchema.safeParse({
      recurrenceId: uuid2,
      actorUserId: uuid
    });

    expect(result.success).toBe(false);
  });

  it('validates pause and resume payloads', () => {
    expect(
      pauseRecurrenceSchema.safeParse({
        recurrenceId: uuid2,
        actorUserId: uuid,
        reason: 'Temporarily on hold'
      }).success
    ).toBe(true);

    expect(
      resumeRecurrenceSchema.safeParse({
        recurrenceId: uuid2,
        actorUserId: uuid
      }).success
    ).toBe(true);
  });
});
