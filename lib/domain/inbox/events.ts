import type { AppSupabaseClient } from '@/lib/supabase/client-types';
import type { Database, Json } from '@/lib/supabase/types';

const EMAIL_ELIGIBLE_TYPES = new Set<
  Database['public']['Tables']['notifications']['Insert']['type']
>(['assignment', 'mention', 'due_soon', 'overdue']);

export async function createNotification(
  supabase: AppSupabaseClient,
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
  const payloadJson = (input.payload ?? {}) as Json;
  const explicitChannel = input.channel;
  const shouldMirrorEmail = !explicitChannel && EMAIL_ELIGIBLE_TYPES.has(input.type);

  const rows: Database['public']['Tables']['notifications']['Insert'][] = [
    {
      workspace_id: input.workspaceId,
      user_id: input.userId,
      type: input.type,
      entity_type: input.entityType,
      entity_id: input.entityId,
      payload_json: payloadJson,
      channel: explicitChannel ?? 'in_app'
    }
  ];

  if (shouldMirrorEmail) {
    rows.push({
      workspace_id: input.workspaceId,
      user_id: input.userId,
      type: input.type,
      entity_type: input.entityType,
      entity_id: input.entityId,
      payload_json: payloadJson,
      channel: 'email'
    });
  }

  const { error } = await supabase.from('notifications').insert(rows);

  if (error) {
    throw error;
  }
}
