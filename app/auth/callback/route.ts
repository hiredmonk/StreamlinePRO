import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClientEnv } from '@/lib/env';

function isLoopbackHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '::1';
}

function resolveAppOrigin(configuredAppUrl: string, requestOrigin: string) {
  const configured = new URL(configuredAppUrl);
  const request = new URL(requestOrigin);

  if (!isLoopbackHost(configured.hostname)) {
    return configured.origin;
  }

  if (!isLoopbackHost(request.hostname)) {
    return request.origin;
  }

  return configured.origin;
}

export async function GET(request: NextRequest) {
  const env = getClientEnv();
  const { searchParams, origin } = new URL(request.url);
  const appOrigin = resolveAppOrigin(env.NEXT_PUBLIC_APP_URL, origin);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/my-tasks';

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${appOrigin}${next}`);
    }
  }

  return NextResponse.redirect(`${appOrigin}/signin`);
}
