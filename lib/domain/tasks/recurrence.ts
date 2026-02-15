import { addDays, addMonths, addWeeks } from 'date-fns';

type RecurrencePattern = {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
};

export function parseRecurrencePattern(pattern: unknown): RecurrencePattern | null {
  if (!pattern || typeof pattern !== 'object') {
    return null;
  }

  const typed = pattern as Record<string, unknown>;
  const frequency = typed.frequency;
  const interval = Number(typed.interval ?? 1);

  if (!['daily', 'weekly', 'monthly'].includes(String(frequency))) {
    return null;
  }

  if (Number.isNaN(interval) || interval < 1 || interval > 365) {
    return null;
  }

  return {
    frequency: frequency as RecurrencePattern['frequency'],
    interval
  };
}

export function getNextDueDate(dueAt: Date, pattern: RecurrencePattern): Date {
  if (pattern.frequency === 'daily') {
    return addDays(dueAt, pattern.interval);
  }

  if (pattern.frequency === 'weekly') {
    return addWeeks(dueAt, pattern.interval);
  }

  return addMonths(dueAt, pattern.interval);
}
