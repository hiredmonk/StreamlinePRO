import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getClientEnv } from '@/lib/env';

export async function GET(request: NextRequest) {
  const env = getClientEnv();
  const { origin } = new URL(request.url);
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL || origin}/auth/callback`
    }
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/signin?error=oauth_failed`);
  }

  return NextResponse.redirect(data.url);
}
