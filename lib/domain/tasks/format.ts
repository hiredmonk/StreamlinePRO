import { format } from 'date-fns';
import type { TaskRecurrencePattern } from '@/lib/domain/tasks/recurrence-types';

export function formatRecurrenceSummary(pattern: TaskRecurrencePattern): string {
  if (pattern.interval === 1) {
    switch (pattern.frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      case 'monthly':
        return 'Monthly';
    }
  }

  const unitMap = { daily: 'days', weekly: 'weeks', monthly: 'months' } as const;
  return `Every ${pattern.interval} ${unitMap[pattern.frequency]}`;
}

export function formatDueDate(input: string | null) {
  if (!input) {
    return 'No due date';
  }

  const date = new Date(input);
  return format(date, 'EEE, MMM d');
}

export function toDateTimeLocalValue(input: string | null) {
  if (!input) {
    return '';
  }

  const date = new Date(input);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  const localDate = new Date(date.getTime() - timezoneOffset);

  return localDate.toISOString().slice(0, 16);
}
