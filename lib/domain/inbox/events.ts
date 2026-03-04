import type { AppSupabaseClient } from '@/lib/supabase/client-types';
import type { Database, Json } from '@/lib/supabase/types';
import {
  buildEmailDedupeKey,
  withEmailDispatchState
} from '@/lib/domain/inbox/email-dispatch-state';

type NotificationInsert = Database['public']['Tables']['notifications']['Insert'];

export async function createNotification(
  supabase: AppSupabaseClient,
  input: {
    workspaceId: string;
    userId: string;
    type: Database['public']['Tables']['notifications']['Insert']['type'];
    entityType: Database['public']['Tables']['notifications']['Insert']['entity_type'];
    entityId: string;
    payload?: Record<string, unknown>;
    channels?: Array<'in_app' | 'email'>;
  }
) {
  const channels: Array<'in_app' | 'email'> = input.channels?.length
    ? (Array.from(new Set(input.channels)) as Array<'in_app' | 'email'>)
    : ['in_app'];
  const rows: NotificationInsert[] = channels.map((channel) => {
    const basePayload = (input.payload ?? {}) as Json;
    const payload =
      channel === 'email'
        ? withEmailDispatchState(
            basePayload,
            {
              dedupeKey: buildEmailDedupeKey({
                workspaceId: input.workspaceId,
                userId: input.userId,
                type: input.type,
                entityType: input.entityType,
                entityId: input.entityId
              }),
              attemptCount: 0,
              status: 'pending'
            }
          )
        : basePayload;

    return {
      workspace_id: input.workspaceId,
      user_id: input.userId,
      type: input.type,
      entity_type: input.entityType,
      entity_id: input.entityId,
      payload_json: payload,
      channel
    };
  });

  const { error } = await supabase.from('notifications').insert(rows);

  if (error) {
    throw error;
  }
}
