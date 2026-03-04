import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/jobs/email-notifications/route';
import { dispatchNotificationBatch } from '@/lib/domain/inbox/email-notifications-provider';

vi.mock('@/lib/domain/inbox/email-notifications-provider', () => ({
  dispatchNotificationBatch: vi.fn()
}));

const originalJobRunnerToken = process.env.JOB_RUNNER_TOKEN;

describe('POST /api/jobs/email-notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.JOB_RUNNER_TOKEN;
  });

  it('returns 503 when JOB_RUNNER_TOKEN is not configured', async () => {
    const response = await POST(
      new Request('http://localhost/api/jobs/email-notifications', { method: 'POST' }) as never
    );

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

  it('returns 400 for invalid request body', async () => {
    process.env.JOB_RUNNER_TOKEN = 'secret-token';

    const response = await POST(
      new Request('http://localhost/api/jobs/email-notifications', {
        method: 'POST',
        headers: {
          authorization: 'Bearer secret-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({ batchSize: 0 })
      }) as never
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        error: 'Invalid request body.'
      })
    );
  });

  it('dispatches with defaults and returns summary for valid token', async () => {
    process.env.JOB_RUNNER_TOKEN = 'secret-token';
    vi.mocked(dispatchNotificationBatch).mockResolvedValue({
      scanned: 11,
      attempted: 5,
      sent: 4,
      retryableErrors: 1,
      permanentErrors: 0
    });

    const response = await POST(
      new Request('http://localhost/api/jobs/email-notifications', {
        method: 'POST',
        headers: {
          authorization: 'Bearer secret-token',
          'content-type': 'application/json'
        },
        body: JSON.stringify({})
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      scanned: 11,
      attempted: 5,
      sent: 4,
      retryableErrors: 1,
      permanentErrors: 0
    });
    expect(dispatchNotificationBatch).toHaveBeenCalledWith({
      batchSize: 100,
      maxAttempts: 3
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

