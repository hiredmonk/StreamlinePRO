import type { AppSupabaseClient } from '@/lib/supabase/client-types';

export async function getInboxItems(
  supabase: AppSupabaseClient,
  userId: string,
  options: { unreadOnly?: boolean } = {}
) {
  let query = supabase
    .from('notifications')
    .select('id, type, channel, entity_type, entity_id, payload_json, read_at, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options.unreadOnly) {
    query = query.is('read_at', null);
  }

  const { data, error } = await query.limit(100);

  if (error) {
    throw error;
  }

  return data ?? [];
}
