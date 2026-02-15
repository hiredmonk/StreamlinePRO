export default function SignInPage() {
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
          Sign in with Google to access your workspace, track commitments, and run projects with Asana-style speed.
        </p>

        <a
          href="/auth/google"
          className="mt-8 inline-flex w-full items-center justify-center rounded-2xl border border-[#d63f2b] bg-[#dd4b39] px-5 py-3 text-base font-semibold text-white transition hover:bg-[#c73b2a]"
        >
          Continue with Google
        </a>
      </section>
    </main>
  );
}
