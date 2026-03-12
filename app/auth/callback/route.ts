import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { acceptWorkspaceInvite } from '@/lib/domain/workspaces/invites';
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
  const next = sanitizeNextPath(searchParams.get('next'));
  const workspaceInvite = searchParams.get('workspaceInvite');

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (workspaceInvite) {
        const {
          data: { user }
        } = await supabase.auth.getUser();

        if (!user?.email) {
          return NextResponse.redirect(
            `${appOrigin}/signin?workspaceInvite=${workspaceInvite}&error=invite_invalid`
          );
        }

        try {
          const acceptedInvite = await acceptWorkspaceInvite({
            inviteId: workspaceInvite,
            userId: user.id,
            email: user.email
          });

          return NextResponse.redirect(
            `${appOrigin}/projects?workspace=${acceptedInvite.workspaceId}`
          );
        } catch (inviteError) {
          const inviteErrorMessage =
            inviteError instanceof Error ? inviteError.message : 'This workspace invite could not be completed.';
          const errorCode = inviteErrorMessage.includes('invited email address')
            ? 'invite_email_mismatch'
            : 'invite_invalid';

          return NextResponse.redirect(
            `${appOrigin}/signin?workspaceInvite=${workspaceInvite}&error=${errorCode}`
          );
        }
      }

      return NextResponse.redirect(`${appOrigin}${next}`);
    }
  }

  return NextResponse.redirect(`${appOrigin}/signin`);
}

function sanitizeNextPath(next: string | null) {
  if (!next || !next.startsWith('/')) {
    return '/my-tasks';
  }

  return next;
}
