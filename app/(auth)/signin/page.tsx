import { getWorkspaceInviteContext } from '@/lib/domain/workspaces/invites';

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: 'Google sign-in could not be started. Please try again.',
  invite_invalid: 'This workspace invite is no longer valid. Ask an admin to send a fresh one.',
  invite_email_mismatch: 'Continue with Google using the email address that received the invite.'
};

export default async function SignInPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; workspaceInvite?: string }>;
}) {
  const params = await searchParams;
  const inviteContext = params.workspaceInvite
    ? await getWorkspaceInviteContext(params.workspaceInvite)
    : null;
  const errorMessage = params.error ? ERROR_MESSAGES[params.error] : null;
  const googleHref = inviteContext
    ? `/auth/google?workspaceInvite=${inviteContext.id}&next=${encodeURIComponent(
        `/projects?workspace=${inviteContext.workspaceId}`
      )}`
    : '/auth/google';

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <section className="glass-panel w-full max-w-xl p-8 sm:p-12">
        <p className="text-xs uppercase tracking-[0.22em] text-[#6b5b4d]">StreamlinePRO</p>
        <h1
          className="mt-2 text-5xl font-semibold leading-[1.03] text-[#21241f]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Work Clarity, <br />
          Built Daily
        </h1>
        <p className="mt-5 text-[17px] text-[#4f534d]">
          Sign in with Google to land in My Tasks, open details in a side drawer, and move from daily execution into project setup without losing context.
        </p>

        <div className="mt-6 grid gap-2 rounded-2xl border border-[#dfd3bc] bg-[#fff9ee] p-4 text-sm text-[#4d514b]">
          <p>After sign-in, your default home is My Tasks.</p>
          <p>Task details stay in a side drawer so list and board context remain visible.</p>
          <p>{inviteContext ? 'Accepted invites take you straight into the invited workspace.' : 'First-time admins continue into workspace and project setup guidance.'}</p>
        </div>

        {inviteContext ? (
          <div className="mt-6 rounded-2xl border border-[#dcc7a6] bg-[#fff6e7] p-4 text-sm text-[#4f4a3f]">
            <p className="font-semibold text-[#2d312d]">Invitation ready</p>
            <p className="mt-1">
              Join <span className="font-semibold">{inviteContext.workspaceName}</span> as a{' '}
              <span className="font-semibold">{inviteContext.role}</span>.
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#7d776a]">
              Use Google with {inviteContext.email}
            </p>
          </div>
        ) : null}

        {errorMessage ? (
          <div className="mt-4 rounded-2xl border border-[#e4b5ae] bg-[#fff1ee] p-4 text-sm text-[#8e3429]">
            {errorMessage}
          </div>
        ) : null}

        <a
          href={googleHref}
          className="mt-8 inline-flex w-full items-center justify-center rounded-2xl border border-[#d63f2b] bg-[#dd4b39] px-5 py-3 text-base font-semibold text-white transition hover:bg-[#c73b2a]"
        >
          Continue with Google
        </a>
      </section>
    </main>
  );
}
