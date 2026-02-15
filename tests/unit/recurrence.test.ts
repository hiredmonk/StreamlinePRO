import { describe, expect, it } from 'vitest';
import { getNextDueDate, parseRecurrencePattern } from '../../lib/domain/tasks/recurrence';

describe('recurrence parsing', () => {
  it('parses a valid weekly recurrence pattern', () => {
    const parsed = parseRecurrencePattern({ frequency: 'weekly', interval: 2 });
    expect(parsed).toEqual({ frequency: 'weekly', interval: 2 });
  });

  it('rejects unsupported patterns', () => {
    const parsed = parseRecurrencePattern({ frequency: 'yearly', interval: 1 });
    expect(parsed).toBeNull();
  });
});

describe('next due date', () => {
  it('calculates next weekly due date', () => {
    const due = new Date('2026-02-15T10:00:00.000Z');
    const next = getNextDueDate(due, { frequency: 'weekly', interval: 1 });
    expect(next.toISOString()).toBe('2026-02-22T10:00:00.000Z');
  });
});
