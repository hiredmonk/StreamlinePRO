import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/types';

export async function createNotification(
  supabase: SupabaseClient<Database>,
  input: {
    workspaceId: string;
    userId: string;
    type: Database['public']['Tables']['notifications']['Insert']['type'];
    entityType: Database['public']['Tables']['notifications']['Insert']['entity_type'];
    entityId: string;
    payload?: Record<string, unknown>;
    channel?: 'in_app' | 'email';
  }
) {
  const { error } = await supabase.from('notifications').insert({
    workspace_id: input.workspaceId,
    user_id: input.userId,
    type: input.type,
    entity_type: input.entityType,
    entity_id: input.entityId,
    payload_json: input.payload ?? {},
    channel: input.channel ?? 'in_app'
  });

  if (error) {
    throw error;
  }
}
