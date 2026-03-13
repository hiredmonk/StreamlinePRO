import { formatDistanceToNowStrict } from 'date-fns';

type InboxItemMetaInput = {
  type: 'assignment' | 'mention' | 'due_soon' | 'overdue' | 'comment' | 'system';
  entity_type: 'task' | 'project' | 'comment' | 'workspace';
  entity_id: string;
  read_at: string | null;
  created_at: string;
};

const labelByType: Record<InboxItemMetaInput['type'], string> = {
  assignment: 'Assigned to you',
  mention: 'You were mentioned',
  due_soon: 'Due soon',
  overdue: 'Overdue alert',
  comment: 'New comment',
  system: 'System notice'
};

export function getInboxItemMeta(item: InboxItemMetaInput) {
  return {
    label: labelByType[item.type],
    relativeCreatedAt: formatDistanceToNowStrict(new Date(item.created_at), {
      addSuffix: true
    }),
    entityHref: item.entity_type === 'task' ? `/my-tasks?task=${item.entity_id}` : null,
    isRead: Boolean(item.read_at)
  };
}
