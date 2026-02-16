import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { generateDueNotifications } from '@/lib/domain/inbox/scheduler';

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

  const supabase = createSupabaseAdminClient();
  const summary = await generateDueNotifications(supabase);

  return NextResponse.json({ ok: true, ...summary });
}
