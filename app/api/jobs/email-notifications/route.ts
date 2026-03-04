import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { dispatchNotificationBatch } from '@/lib/domain/inbox/email-notifications-provider';

const requestBodySchema = z.object({
  now: z.string().datetime().optional(),
  batchSize: z.number().int().min(1).max(500).default(100),
  maxAttempts: z.number().int().min(1).max(10).default(3)
});

function getJobToken(request: NextRequest) {
  const headerToken = request.headers.get('x-job-token');
  if (headerToken) {
    return headerToken;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader) {
    return null;
  }

  const [scheme, token] = authHeader.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null;
  }

  return token;
}

export async function POST(request: NextRequest) {
  const expectedToken = process.env.JOB_RUNNER_TOKEN;
  if (!expectedToken) {
    return NextResponse.json({ error: 'JOB_RUNNER_TOKEN is not configured.' }, { status: 503 });
  }

  const providedToken = getJobToken(request);
  if (!providedToken || providedToken !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const rawBody = await request.json().catch(() => ({}));
  const parsedBody = requestBodySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json(
      { error: 'Invalid request body.', details: parsedBody.error.flatten() },
      { status: 400 }
    );
  }

  const summary = await dispatchNotificationBatch(parsedBody.data);
  return NextResponse.json({ ok: true, ...summary });
}

