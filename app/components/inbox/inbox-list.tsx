import { formatDistanceToNowStrict } from 'date-fns';
import { markNotificationReadFromForm } from '@/lib/actions/form-actions';
import type { Json } from '@/lib/supabase/types';

type InboxItem = {
  id: string;
  type: 'assignment' | 'mention' | 'due_soon' | 'overdue' | 'comment' | 'system';
  entity_type: 'task' | 'project' | 'comment' | 'workspace';
  entity_id: string;
  payload_json: Json;
  read_at: string | null;
  created_at: string;
};

const labelByType: Record<InboxItem['type'], string> = {
  assignment: 'Assigned to you',
  mention: 'You were mentioned',
  due_soon: 'Due soon',
  overdue: 'Overdue alert',
  comment: 'New comment',
  system: 'System notice'
};

export function InboxList({ items }: { items: InboxItem[] }) {
  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <li key={item.id} className="glass-panel p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-[#252a25]">{labelByType[item.type]}</p>
            <p className="text-xs text-[#707570]">
              {formatDistanceToNowStrict(new Date(item.created_at), { addSuffix: true })}
            </p>
          </div>
          <p className="text-sm text-[#5d625e]">
            Entity: <strong>{item.entity_type}</strong> · {item.entity_id.slice(0, 8)}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {item.entity_type === 'task' ? (
              <a
                href={`/my-tasks?task=${item.entity_id}`}
                className="rounded-lg border border-[#d8cdb7] bg-[#f8eed8] px-3 py-1 text-sm font-semibold text-[#5d5139]"
              >
                Open task
              </a>
            ) : null}
            {!item.read_at ? (
              <form action={markNotificationReadFromForm}>
                <input type="hidden" name="id" value={item.id} />
                <button className="rounded-lg border border-[#ccc3b0] bg-white px-3 py-1 text-sm" type="submit">
                  Mark read
                </button>
              </form>
            ) : (
              <span className="text-xs text-[#7b7f7a]">Read</span>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
