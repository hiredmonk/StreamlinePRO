import type { ProjectSetupGuide } from '@/lib/view-models/onboarding';

export function ProjectSetupGuidePanel({ guide }: { guide: ProjectSetupGuide }) {
  return (
    <section id="project-setup-guide" className="glass-panel space-y-4 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#6f675d]">Project setup</p>
        <h2 className="text-2xl font-semibold text-[#1f241f]" style={{ fontFamily: 'var(--font-display)' }}>
          {guide.title}
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-[#5d635e]">{guide.description}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {guide.actions.map((action) => (
          <a
            key={action.href}
            href={action.href}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-[#dacfb8] bg-[#fff8ec] px-4 text-sm font-semibold text-[#3a3d3a] transition hover:bg-[#f6ecd8]"
          >
            {action.label}
          </a>
        ))}
      </div>

      <ul className="grid gap-2 text-sm text-[#5d635e]">
        {guide.tips.map((tip) => (
          <li key={tip} className="rounded-xl border border-[#ddd2bc] bg-[#fffdf8] px-3 py-2">
            {tip}
          </li>
        ))}
      </ul>
    </section>
  );
}
