import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/jobs/due-notifications/route';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateDueNotifications } from '@/lib/domain/inbox/scheduler';

vi.mock('@/lib/supabase/admin', () => ({ createSupabaseAdminClient: vi.fn() }));
vi.mock('@/lib/domain/inbox/scheduler', () => ({ generateDueNotifications: vi.fn() }));

const originalJobRunnerToken = process.env.JOB_RUNNER_TOKEN;

describe('POST /api/jobs/due-notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.JOB_RUNNER_TOKEN;
  });

  it('returns 503 when JOB_RUNNER_TOKEN is not configured', async () => {
    const response = await POST(new Request('http://localhost/api/jobs/due-notifications', { method: 'POST' }) as never);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'JOB_RUNNER_TOKEN is not configured.' });
  });

  it('returns 401 when token is missing or invalid', async () => {
    process.env.JOB_RUNNER_TOKEN = 'secret-token';

    const response = await POST(
      new Request('http://localhost/api/jobs/due-notifications', {
        method: 'POST',
        headers: {
          'x-job-token': 'wrong-token'
        }
      }) as never
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  it('runs the scheduler and returns summary for valid token', async () => {
    process.env.JOB_RUNNER_TOKEN = 'secret-token';
    vi.mocked(createSupabaseAdminClient).mockReturnValue({ from: vi.fn() } as never);
    vi.mocked(generateDueNotifications).mockResolvedValue({
      scanned: 10,
      candidates: 4,
      created: 3,
      skipped: 1
    });

    const response = await POST(
      new Request('http://localhost/api/jobs/due-notifications', {
        method: 'POST',
        headers: {
          authorization: 'Bearer secret-token'
        }
      }) as never
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      scanned: 10,
      candidates: 4,
      created: 3,
      skipped: 1
    });
    expect(createSupabaseAdminClient).toHaveBeenCalledTimes(1);
    expect(generateDueNotifications).toHaveBeenCalledTimes(1);
  });
});

afterAll(() => {
  if (originalJobRunnerToken === undefined) {
    delete process.env.JOB_RUNNER_TOKEN;
  } else {
    process.env.JOB_RUNNER_TOKEN = originalJobRunnerToken;
  }
});
