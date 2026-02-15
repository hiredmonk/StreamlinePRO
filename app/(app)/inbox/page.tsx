import { InboxList } from '@/app/components/inbox/inbox-list';
import { EmptyState } from '@/app/components/ui/empty-state';
import { requireUser } from '@/lib/auth';
import { getInboxItems } from '@/lib/domain/inbox/queries';

export default async function InboxPage() {
  const { user, supabase } = await requireUser();
  const items = await getInboxItems(supabase, user.id);

  return (
    <div className="space-y-4">
      <section className="glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[#6e6a63]">Inbox</p>
        <h1 className="text-3xl font-semibold text-[#1f241f]" style={{ fontFamily: 'var(--font-display)' }}>
          Notifications
        </h1>
        <p className="mt-1 text-sm text-[#5c605a]">Assignments, mentions, and due reminders across your workspace.</p>
      </section>

      {items.length ? (
        <InboxList items={items} />
      ) : (
        <EmptyState
          title="Inbox zero"
          description="You are all caught up. New mentions, assignments, and due alerts will show up here."
        />
      )}
    </div>
  );
}
