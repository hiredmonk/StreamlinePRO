import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/jobs/email-notifications/route';
import { dispatchNotificationBatch } from '@/lib/domain/inbox/email-notifications';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock('@/lib/domain/inbox/email-notifications', () => ({ dispatchNotificationBatch: vi.fn() }));

const originalJobRunnerToken = process.env.JOB_RUNNER_TOKEN;

describe('POST /api/jobs/email-notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.JOB_RUNNER_TOKEN;
  });

  it('returns 503 when JOB_RUNNER_TOKEN is not configured', async () => {
    const response = await POST(new Request('http://localhost/api/jobs/email-notifications', { method: 'POST' }) as never);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'JOB_RUNNER_TOKEN is not configured.' });
  });

  it('returns 401 when token is missing or invalid', async () => {
    process.env.JOB_RUNNER_TOKEN = 'secret-token';

    const response = await POST(
      new Request('http://localhost/api/jobs/email-notifications', {
        method: 'POST',
        headers: {
          'x-job-token': 'wrong-token'
        }
      }) as never
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('dispatches notifications and returns summary for valid token', async () => {
    process.env.JOB_RUNNER_TOKEN = 'secret-token';
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: vi.fn(), auth: { admin: { getUserById: vi.fn() } } } as never);
    vi.mocked(dispatchNotificationBatch).mockResolvedValue({
      scanned: 10,
      attempted: 7,
      sent: 5,
      retryableErrors: 1,
      permanentErrors: 1
    });

    const response = await POST(
      new Request('http://localhost/api/jobs/email-notifications', {
        method: 'POST',
        headers: {
          authorization: 'Bearer secret-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ batchSize: 50, maxAttempts: 2 })
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      scanned: 10,
      attempted: 7,
      sent: 5,
      retryableErrors: 1,
      permanentErrors: 1
    });
    expect(createSupabaseAdminClient).toHaveBeenCalledTimes(1);
    expect(dispatchNotificationBatch).toHaveBeenCalledWith(expect.anything(), {
      batchSize: 50,
      maxAttempts: 2
    });
  });
});

afterAll(() => {
  if (originalJobRunnerToken === undefined) {
    delete process.env.JOB_RUNNER_TOKEN;
  } else {
    process.env.JOB_RUNNER_TOKEN = originalJobRunnerToken;
  }
});
