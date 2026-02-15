import { describe, expect, it } from 'vitest';
import { getInboxItems } from '@/lib/domain/inbox/queries';
import { createNotification } from '@/lib/domain/inbox/events';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

describe('inbox queries', () => {
  it('returns latest items and applies unread filter when requested', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'notifications',
        response: {
          data: [{ id: 'n1', read_at: null }]
        }
      }
    ]);

    const items = await getInboxItems(supabase as never, 'u1', { unreadOnly: true });

    expect(items).toEqual([{ id: 'n1', read_at: null }]);

    const chain = history[0]?.chain;
    expect(chain?.eq).toHaveBeenCalledWith('user_id', 'u1');
    expect(chain?.is).toHaveBeenCalledWith('read_at', null);
    expect(chain?.limit).toHaveBeenCalledWith(100);
  });

  it('throws when inbox query fails', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'notifications',
        response: {
          data: null,
          error: new Error('permission denied')
        }
      }
    ]);

    await expect(getInboxItems(supabase as never, 'u1')).rejects.toThrow('permission denied');
  });
});

describe('notification events', () => {
  it('inserts notification with default channel', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'notifications',
        response: { data: null, error: null }
      }
    ]);

    await createNotification(supabase as never, {
      workspaceId: 'w1',
      userId: 'u2',
      type: 'assignment',
      entityType: 'task',
      entityId: 't1',
      payload: { title: 'Task A' }
    });

    const insertPayload = history[0]?.chain.insert.mock.calls[0]?.[0];
    expect(insertPayload.channel).toBe('in_app');
    expect(insertPayload.workspace_id).toBe('w1');
  });

  it('throws when insert fails', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'notifications',
        response: { data: null, error: new Error('insert failed') }
      }
    ]);

    await expect(
      createNotification(supabase as never, {
        workspaceId: 'w1',
        userId: 'u2',
        type: 'comment',
        entityType: 'task',
        entityId: 't1'
      })
    ).rejects.toThrow('insert failed');
  });
});
