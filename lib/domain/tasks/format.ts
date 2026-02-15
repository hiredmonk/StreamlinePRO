import { format } from 'date-fns';

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
