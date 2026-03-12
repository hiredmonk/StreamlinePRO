import type { WorkspaceOnboardingState } from '@/lib/view-models/onboarding';

const STEP_STATUS_STYLES = {
  complete: 'border-[#9cc9a4] bg-[#edf8ef] text-[#1e6a39]',
  current: 'border-[#e0b074] bg-[#fff5e6] text-[#8f4f04]',
  pending: 'border-[#ddd2bc] bg-[#fffdf8] text-[#5e645f]'
} as const;

export function WorkspaceOnboardingPanel({ onboarding }: { onboarding: WorkspaceOnboardingState }) {
  return (
    <section className="glass-panel space-y-5 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#6f675d]">Workspace onboarding</p>
        <h2 className="text-2xl font-semibold text-[#1f241f]" style={{ fontFamily: 'var(--font-display)' }}>
          {onboarding.title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-[#5d635e]">{onboarding.description}</p>
      </div>

      <ol className="grid gap-3 lg:grid-cols-2">
        {onboarding.steps.map((step, index) => (
          <li
            key={step.id}
            className={`rounded-xl border p-3 ${STEP_STATUS_STYLES[step.status]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.16em]">Step {index + 1}</p>
                <p className="mt-1 text-base font-semibold">{step.title}</p>
                <p className="mt-1 text-sm text-inherit/90">{step.description}</p>
              </div>
              {step.optional ? (
                <span className="rounded-full border border-current/20 px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.12em]">
                  Optional
                </span>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-wrap gap-3">
        <a
          href={onboarding.primaryAction.href}
          className="inline-flex h-10 items-center justify-center rounded-xl border border-[#cb3f2f] bg-[#dd4b39] px-4 text-sm font-semibold text-white transition hover:bg-[#c63a2a]"
        >
          {onboarding.primaryAction.label}
        </a>
        {onboarding.secondaryAction ? (
          <a
            href={onboarding.secondaryAction.href}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#dacfb8] bg-[#fff8ec] px-4 text-sm font-semibold text-[#3a3d3a] transition hover:bg-[#f6ecd8]"
          >
            {onboarding.secondaryAction.label}
          </a>
        ) : null}
      </div>
    </section>
  );
}
