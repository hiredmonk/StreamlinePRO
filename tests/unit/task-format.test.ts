import { describe, expect, it } from 'vitest';
import { formatDueDate, toDateTimeLocalValue } from '../../lib/domain/tasks/format';

describe('task format helpers', () => {
  it('returns fallback label for null due date', () => {
    expect(formatDueDate(null)).toBe('No due date');
  });

  it('returns datetime-local compatible value', () => {
    const value = toDateTimeLocalValue('2026-02-15T14:30:00.000Z');
    expect(value.length).toBe(16);
  });
});
