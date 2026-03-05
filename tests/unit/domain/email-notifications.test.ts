import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  dispatchNotificationBatch,
  mapNotificationToEmailPayload,
  sendNotificationEmail
} from '@/lib/domain/inbox/email-notifications';

describe('email notifications domain', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.SKIP_ENV_VALIDATION = '1';
    process.env.EMAIL_PROVIDER_API_KEY = 'test-key';
    process.env.EMAIL_FROM_ADDRESS = 'noreply@example.com';
    process.env.NEXT_PUBLIC_APP_URL = 'http://127.0.0.1:3000';
  });

  it('maps an email notification to payload', async () => {
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'notifications') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: {
                    id: 'n1',
                    workspace_id: 'w1',
                    user_id: 'u1',
                    type: 'assignment',
                    entity_type: 'task',
                    entity_id: 't1',
                    payload_json: {},
                    channel: 'email'
                  },
                  error: null
                }))
              }))
            }))
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({ data: { user: { email: 'user@example.com' } }, error: null }))
        }
      }
    };

    const output = await mapNotificationToEmailPayload(supabase as never, { notificationId: 'n1' });
    expect(output.payload.recipientEmail).toBe('user@example.com');
    expect(output.payload.subject).toBe('You were assigned a task');
  });

  it('returns sent when provider accepts request', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: 'msg-1' })
      }))
    );

    const output = await sendNotificationEmail({
      payload: {
        notificationId: 'n1',
        workspaceId: 'w1',
        recipientUserId: 'u1',
        recipientEmail: 'user@example.com',
        type: 'assignment',
        entityType: 'task',
        entityId: 't1',
        subject: 'hello',
        textBody: 'body',
        dedupeKey: 'k1'
      },
      providerConfig: {
        provider: 'resend',
        apiKey: 'key',
        fromAddress: 'noreply@example.com'
      },
      attempt: 1
    });

    expect(output.status).toBe('sent');
    expect(output.providerMessageId).toBe('msg-1');
  });

  it('classifies provider 400 as permanent error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 400,
        json: async () => ({ message: 'bad request' })
      }))
    );

    const output = await sendNotificationEmail({
      payload: {
        notificationId: 'n1',
        workspaceId: 'w1',
        recipientUserId: 'u1',
        recipientEmail: 'user@example.com',
        type: 'assignment',
        entityType: 'task',
        entityId: 't1',
        subject: 'hello',
        textBody: 'body',
        dedupeKey: 'k1'
      },
      providerConfig: {
        provider: 'resend',
        apiKey: 'key',
        fromAddress: 'noreply@example.com'
      },
      attempt: 1
    });

    expect(output.status).toBe('permanent_error');
    expect(output.errorCode).toBe('HTTP_400');
  });

  it('dispatches batch and updates payload delivery state', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ id: 'msg-2' })
      }))
    );

    const updates: Array<{ payload_json: unknown; id: string }> = [];
    let notificationSelectCalls = 0;
    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'notifications') {
          const updateChain = {
            eq: vi.fn((_: string, id: string) => {
              updates.push({ payload_json: (updateChain as any)._payloadJson, id });
              return Promise.resolve({ data: null, error: null });
            }),
            _payloadJson: null as unknown
          };

          return {
            select: vi.fn(() => {
              notificationSelectCalls += 1;
              if (notificationSelectCalls === 1) {
                return {
                  eq: vi.fn(() => ({
                    order: vi.fn(() => ({
                      limit: vi.fn(async () => ({
                        data: [
                          {
                            id: 'n1',
                            user_id: 'u1',
                            channel: 'email',
                            type: 'assignment',
                            payload_json: {},
                            created_at: '2026-03-04T00:00:00.000Z'
                          }
                        ],
                        error: null
                      }))
                    }))
                  }))
                };
              }

              return {
                eq: vi.fn(() => ({
                  maybeSingle: vi.fn(async () => ({
                    data: {
                      id: 'n1',
                      workspace_id: 'w1',
                      user_id: 'u1',
                      type: 'assignment',
                      entity_type: 'task',
                      entity_id: 't1',
                      payload_json: {},
                      channel: 'email'
                    },
                    error: null
                  }))
                }))
              };
            }),
            update: vi.fn((input: { payload_json: unknown }) => {
              updateChain._payloadJson = input.payload_json;
              return updateChain;
            })
          };
        }
        throw new Error(`Unexpected table: ${table}`);
      }),
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({ data: { user: { email: 'user@example.com' } }, error: null }))
        }
      }
    };

    const summary = await dispatchNotificationBatch(supabase as never, {
      batchSize: 10,
      maxAttempts: 3
    });

    expect(summary).toEqual({
      scanned: 1,
      attempted: 1,
      sent: 1,
      retryableErrors: 0,
      permanentErrors: 0
    });
    expect(updates).toHaveLength(1);
    expect(updates[0]?.id).toBe('n1');
    expect(updates[0]?.payload_json).toEqual(
      expect.objectContaining({
        emailDelivery: expect.objectContaining({
          status: 'sent',
          attempts: 1,
          providerMessageId: 'msg-2'
        })
      })
    );
  });
});
