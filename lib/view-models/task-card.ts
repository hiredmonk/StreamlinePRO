import { formatDistanceToNowStrict } from 'date-fns';
import { formatDueDate } from '@/lib/domain/tasks/format';
import type { TaskWithRelations } from '@/lib/domain/tasks/queries';

export function getTaskCardMeta(task: TaskWithRelations, now = new Date()) {
  const isOverdue = Boolean(task.due_at && !task.completed_at && new Date(task.due_at) < now);

  return {
    dueLabel: formatDueDate(task.due_at),
    relativeDueLabel: task.due_at
      ? formatDistanceToNowStrict(new Date(task.due_at), { addSuffix: true })
      : null,
    isOverdue,
    isWaiting: normalizeStatusName(task.status.name) === 'waiting',
    priority: task.priority
  };
}

function normalizeStatusName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
