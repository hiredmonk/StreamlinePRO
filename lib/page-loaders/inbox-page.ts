import { requireUser } from '@/lib/auth';
import { getInboxItems } from '@/lib/domain/inbox/queries';

export async function loadInboxPageData() {
  const { user, supabase } = await requireUser();
  const items = await getInboxItems(supabase, user.id);

  return {
    items
  };
}
