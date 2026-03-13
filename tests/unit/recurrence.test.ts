import { describe, expect, it } from 'vitest';
import { getNextDueDate, parseRecurrencePattern } from '../../lib/domain/tasks/recurrence';
import { formatRecurrenceSummary } from '../../lib/domain/tasks/format';

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

describe('formatRecurrenceSummary', () => {
  it('returns "Daily" for interval 1', () => {
    expect(formatRecurrenceSummary({ frequency: 'daily', interval: 1 })).toBe('Daily');
  });

  it('returns "Weekly" for interval 1', () => {
    expect(formatRecurrenceSummary({ frequency: 'weekly', interval: 1 })).toBe('Weekly');
  });

  it('returns "Monthly" for interval 1', () => {
    expect(formatRecurrenceSummary({ frequency: 'monthly', interval: 1 })).toBe('Monthly');
  });

  it('returns "Every 2 weeks" for interval 2', () => {
    expect(formatRecurrenceSummary({ frequency: 'weekly', interval: 2 })).toBe('Every 2 weeks');
  });

  it('returns "Every 3 months" for interval 3', () => {
    expect(formatRecurrenceSummary({ frequency: 'monthly', interval: 3 })).toBe('Every 3 months');
  });

  it('returns "Every 5 days" for interval 5', () => {
    expect(formatRecurrenceSummary({ frequency: 'daily', interval: 5 })).toBe('Every 5 days');
  });
});
