import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dispatchNotificationBatch,
  mapNotificationToEmailPayload,
  sendNotificationEmail
} from '@/lib/domain/inbox/email-notifications-provider';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';
import { getClientEnv, getServerEnv } from '@/lib/env';

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock('@/lib/env', () => ({ getServerEnv: vi.fn(), getClientEnv: vi.fn() }));

describe('email notifications provider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getServerEnv).mockReturnValue({
      EMAIL_PROVIDER_API_KEY: 'resend-key',
      EMAIL_FROM_ADDRESS: 'noreply@example.com'
    } as never);
    vi.mocked(getClientEnv).mockReturnValue({
      NEXT_PUBLIC_APP_URL: 'http://127.0.0.1:3000'
    } as never);
  });

  it('maps notification row to email payload', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'notifications',
        response: {
          data: {
            id: 'n1',
            workspace_id: 'w1',
            user_id: 'u1',
            type: 'assignment',
            entity_type: 'task',
            entity_id: 't1',
            payload_json: {}
          },
          error: null
        }
      }
    ]);

    (supabase.auth as any).admin = {
      getUserById: vi.fn(async () => ({ data: { user: { email: 'member@example.com' } }, error: null }))
    };
    vi.mocked(createSupabaseAdminClient).mockReturnValue(supabase as never);

    const result = await mapNotificationToEmailPayload({ notificationId: 'n1' });

    expect(result.payload).toEqual(
      expect.objectContaining({
        notificationId: 'n1',
        workspaceId: 'w1',
        recipientUserId: 'u1',
        recipientEmail: 'member@example.com',
        type: 'assignment',
        entityType: 'task',
        entityId: 't1'
      })
    );
    expect(result.payload.dedupeKey).toBe('w1:u1:assignment:task:t1:email');
    expect(result.payload.subject).toBe('You have a new task assignment');
  });

  it('marks missing recipient email as permanent in batch dispatch', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'notifications',
        response: {
          data: [
            {
              id: 'n1',
              workspace_id: 'w1',
              user_id: 'u1',
              type: 'assignment',
              entity_type: 'task',
              entity_id: 't1',
              payload_json: {
                emailDispatch: { status: 'pending', attemptCount: 0, dedupeKey: 'k1' }
              }
            }
          ],
          error: null
        }
      },
      {
        table: 'notifications',
        response: {
          data: {
            id: 'n1',
            workspace_id: 'w1',
            user_id: 'u1',
            type: 'assignment',
            entity_type: 'task',
            entity_id: 't1',
            payload_json: {
              emailDispatch: { status: 'pending', attemptCount: 0, dedupeKey: 'k1' }
            }
          },
          error: null
        }
      },
      {
        table: 'notifications',
        response: { data: null, error: null }
      }
    ]);

    (supabase.auth as any).admin = {
      getUserById: vi.fn(async () => ({ data: { user: { email: null } }, error: null }))
    };
    vi.mocked(createSupabaseAdminClient).mockReturnValue(supabase as never);
    global.fetch = vi.fn();

    const summary = await dispatchNotificationBatch({
      batchSize: 10,
      maxAttempts: 3
    });

    expect(summary).toEqual({
      scanned: 1,
      attempted: 1,
      sent: 0,
      retryableErrors: 0,
      permanentErrors: 1
    });
    expect(global.fetch).not.toHaveBeenCalled();

    const updateEntry = history.find((entry) => entry.chain.update.mock.calls.length > 0);
    const updatePayload = updateEntry?.chain.update.mock.calls[0]?.[0];
    expect(updatePayload).toEqual(
      expect.objectContaining({
        payload_json: expect.objectContaining({
          emailDispatch: expect.objectContaining({
            status: 'permanent_error',
            attemptCount: 1,
            errorCode: 'recipient_email_missing'
          })
        })
      })
    );
  });

  it('classifies provider responses and updates dispatch summary', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'notifications',
        response: {
          data: [
            {
              id: 'n1',
              workspace_id: 'w1',
              user_id: 'u1',
              type: 'assignment',
              entity_type: 'task',
              entity_id: 't1',
              payload_json: {
                emailDispatch: { status: 'pending', attemptCount: 0, dedupeKey: 'k1' }
              }
            },
            {
              id: 'n2',
              workspace_id: 'w1',
              user_id: 'u2',
              type: 'due_soon',
              entity_type: 'task',
              entity_id: 't2',
              payload_json: {
                emailDispatch: { status: 'retryable_error', attemptCount: 1, dedupeKey: 'k2' }
              }
            },
            {
              id: 'n3',
              workspace_id: 'w1',
              user_id: 'u3',
              type: 'comment',
              entity_type: 'comment',
              entity_id: 'c1',
              payload_json: {
                emailDispatch: { status: 'sent', attemptCount: 1, dedupeKey: 'k3' }
              }
            }
          ],
          error: null
        }
      },
      {
        table: 'notifications',
        response: {
          data: {
            id: 'n1',
            workspace_id: 'w1',
            user_id: 'u1',
            type: 'assignment',
            entity_type: 'task',
            entity_id: 't1',
            payload_json: {
              emailDispatch: { status: 'pending', attemptCount: 0, dedupeKey: 'k1' }
            }
          },
          error: null
        }
      },
      {
        table: 'notifications',
        response: { data: null, error: null }
      },
      {
        table: 'notifications',
        response: {
          data: {
            id: 'n2',
            workspace_id: 'w1',
            user_id: 'u2',
            type: 'due_soon',
            entity_type: 'task',
            entity_id: 't2',
            payload_json: {
              emailDispatch: { status: 'retryable_error', attemptCount: 1, dedupeKey: 'k2' }
            }
          },
          error: null
        }
      },
      {
        table: 'notifications',
        response: { data: null, error: null }
      }
    ]);

    (supabase.auth as any).admin = {
      getUserById: vi.fn(async ({ id }: { id: string }) => ({
        data: { user: { email: `${id}@example.com` } },
        error: null
      }))
    };
    vi.mocked(createSupabaseAdminClient).mockReturnValue(supabase as never);
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'provider-message-1' }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: 'Rate limited' }), {
          status: 429,
          headers: { 'content-type': 'application/json' }
        })
      );

    const summary = await dispatchNotificationBatch({
      batchSize: 2,
      maxAttempts: 3,
      now: '2026-03-03T00:00:00.000Z'
    });

    expect(summary).toEqual({
      scanned: 3,
      attempted: 2,
      sent: 1,
      retryableErrors: 1,
      permanentErrors: 0
    });

    const updateEntries = history.filter((entry) => entry.chain.update.mock.calls.length > 0);
    expect(updateEntries).toHaveLength(2);
    expect(updateEntries[0]?.chain.update.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        payload_json: expect.objectContaining({
          emailDispatch: expect.objectContaining({
            status: 'sent',
            attemptCount: 1,
            providerMessageId: 'provider-message-1'
          })
        })
      })
    );
    expect(updateEntries[1]?.chain.update.mock.calls[0]?.[0]).toEqual(
      expect.objectContaining({
        payload_json: expect.objectContaining({
          emailDispatch: expect.objectContaining({
            status: 'retryable_error',
            attemptCount: 2,
            errorCode: 'http_429'
          })
        })
      })
    );
  });

  it('returns sent output on successful provider response', async () => {
    global.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: 'provider-message-1' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );

    const output = await sendNotificationEmail({
      payload: {
        notificationId: 'n1',
        workspaceId: 'w1',
        recipientUserId: 'u1',
        recipientEmail: 'u1@example.com',
        type: 'assignment',
        entityType: 'task',
        entityId: 't1',
        subject: 'Subject',
        textBody: 'Body',
        dedupeKey: 'k1'
      },
      providerConfig: {
        provider: 'resend',
        apiKey: 'resend-key',
        fromAddress: 'noreply@example.com'
      },
      attempt: 1
    });

    expect(output).toEqual({
      notificationId: 'n1',
      accepted: true,
      providerMessageId: 'provider-message-1',
      status: 'sent'
    });
  });

  it('returns retryable_error on timeout and permanent_error on hard rejection', async () => {
    const timeoutError = new Error('timed out');
    timeoutError.name = 'AbortError';
    global.fetch = vi.fn().mockRejectedValueOnce(timeoutError).mockResolvedValueOnce(
      new Response(JSON.stringify({ message: 'Invalid recipient' }), {
        status: 422,
        headers: { 'content-type': 'application/json' }
      })
    );

    const timeoutOutput = await sendNotificationEmail({
      payload: {
        notificationId: 'n-timeout',
        workspaceId: 'w1',
        recipientUserId: 'u1',
        recipientEmail: 'u1@example.com',
        type: 'assignment',
        entityType: 'task',
        entityId: 't1',
        subject: 'Subject',
        textBody: 'Body',
        dedupeKey: 'k-timeout'
      },
      providerConfig: {
        provider: 'resend',
        apiKey: 'resend-key',
        fromAddress: 'noreply@example.com'
      },
      attempt: 1
    });

    const permanentOutput = await sendNotificationEmail({
      payload: {
        notificationId: 'n-reject',
        workspaceId: 'w1',
        recipientUserId: 'u1',
        recipientEmail: 'u1@example.com',
        type: 'assignment',
        entityType: 'task',
        entityId: 't1',
        subject: 'Subject',
        textBody: 'Body',
        dedupeKey: 'k-reject'
      },
      providerConfig: {
        provider: 'resend',
        apiKey: 'resend-key',
        fromAddress: 'noreply@example.com'
      },
      attempt: 2
    });

    expect(timeoutOutput).toEqual(
      expect.objectContaining({
        notificationId: 'n-timeout',
        accepted: false,
        status: 'retryable_error',
        errorCode: 'timeout'
      })
    );
    expect(permanentOutput).toEqual(
      expect.objectContaining({
        notificationId: 'n-reject',
        accepted: false,
        status: 'permanent_error',
        errorCode: 'http_422'
      })
    );
  });
});

