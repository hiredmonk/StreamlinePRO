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
  const { origin } = new URL(request.url);
  const appOrigin = resolveAppOrigin(env.NEXT_PUBLIC_APP_URL, origin);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${appOrigin}/auth/callback`
    }
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/signin?error=oauth_failed`);
  }

  return NextResponse.redirect(data.url);
}
