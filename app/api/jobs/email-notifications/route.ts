import { NextResponse, type NextRequest } from 'next/server';
import { dispatchNotificationBatch } from '@/lib/domain/inbox/email-notifications';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

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

  const body = await request.json().catch(() => ({}));
  const batchSize = typeof body.batchSize === 'number' && body.batchSize > 0 ? body.batchSize : 100;
  const maxAttempts = typeof body.maxAttempts === 'number' && body.maxAttempts > 0 ? body.maxAttempts : 3;

  const supabase = createSupabaseAdminClient();
  const summary = await dispatchNotificationBatch(supabase as never, { batchSize, maxAttempts });

  return NextResponse.json({ ok: true, ...summary });
}
