import { describe, expect, it } from 'vitest';
import {
  createTaskRecurrenceSchema,
  updateTaskRecurrenceSchema,
  pauseTaskRecurrenceSchema,
  resumeTaskRecurrenceSchema,
  clearTaskRecurrenceSchema
} from '@/lib/validators/recurrence';

const validUuid = '11111111-1111-4111-8111-111111111111';
const recurrenceUuid = '22222222-2222-4222-8222-222222222222';

describe('createTaskRecurrenceSchema', () => {
  it('accepts valid input', () => {
    const result = createTaskRecurrenceSchema.parse({
      taskId: validUuid,
      frequency: 'weekly',
      interval: 2
    });
    expect(result).toEqual({ taskId: validUuid, frequency: 'weekly', interval: 2 });
  });

  it('rejects invalid frequency', () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({
        taskId: validUuid,
        frequency: 'yearly',
        interval: 1
      })
    ).toThrow();
  });

  it('rejects interval below 1', () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({
        taskId: validUuid,
        frequency: 'daily',
        interval: 0
      })
    ).toThrow();
  });

  it('rejects interval above 365', () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({
        taskId: validUuid,
        frequency: 'daily',
        interval: 366
      })
    ).toThrow();
  });

  it('rejects non-integer interval', () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({
        taskId: validUuid,
        frequency: 'weekly',
        interval: 1.5
      })
    ).toThrow();
  });

  it('rejects invalid UUID', () => {
    expect(() =>
      createTaskRecurrenceSchema.parse({
        taskId: 'not-a-uuid',
        frequency: 'weekly',
        interval: 1
      })
    ).toThrow();
  });
});

describe('updateTaskRecurrenceSchema', () => {
  it('accepts valid input', () => {
    const result = updateTaskRecurrenceSchema.parse({
      taskId: validUuid,
      recurrenceId: recurrenceUuid,
      frequency: 'monthly',
      interval: 3
    });
    expect(result.recurrenceId).toBe(recurrenceUuid);
    expect(result.frequency).toBe('monthly');
  });

  it('rejects missing recurrenceId', () => {
    expect(() =>
      updateTaskRecurrenceSchema.parse({
        taskId: validUuid,
        frequency: 'weekly',
        interval: 1
      })
    ).toThrow();
  });
});

describe('pauseTaskRecurrenceSchema', () => {
  it('accepts valid input', () => {
    const result = pauseTaskRecurrenceSchema.parse({
      taskId: validUuid,
      recurrenceId: recurrenceUuid
    });
    expect(result).toEqual({ taskId: validUuid, recurrenceId: recurrenceUuid });
  });

  it('rejects invalid recurrenceId', () => {
    expect(() =>
      pauseTaskRecurrenceSchema.parse({
        taskId: validUuid,
        recurrenceId: 'bad'
      })
    ).toThrow();
  });
});

describe('resumeTaskRecurrenceSchema', () => {
  it('accepts valid input', () => {
    const result = resumeTaskRecurrenceSchema.parse({
      taskId: validUuid,
      recurrenceId: recurrenceUuid
    });
    expect(result).toEqual({ taskId: validUuid, recurrenceId: recurrenceUuid });
  });
});

describe('clearTaskRecurrenceSchema', () => {
  it('accepts valid input', () => {
    const result = clearTaskRecurrenceSchema.parse({
      taskId: validUuid,
      recurrenceId: recurrenceUuid
    });
    expect(result).toEqual({ taskId: validUuid, recurrenceId: recurrenceUuid });
  });

  it('rejects invalid taskId', () => {
    expect(() =>
      clearTaskRecurrenceSchema.parse({
        taskId: 'nope',
        recurrenceId: recurrenceUuid
      })
    ).toThrow();
  });
});
