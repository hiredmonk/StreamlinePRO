import Link from 'next/link';
import type { ProjectSummary } from '@/lib/domain/projects/queries';

export function ProjectCardGrid({ projects }: { projects: ProjectSummary[] }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {projects.map((project) => (
        <Link
          key={project.id}
          href={`/projects/${project.id}`}
          className="glass-panel block p-5 transition hover:-translate-y-0.5 hover:border-[#d8b48d]"
        >
          <p className="text-xs uppercase tracking-[0.2em] text-[#7d766c]">{project.privacy.replace('_', ' ')}</p>
          <h3 className="mt-2 text-2xl font-semibold text-[#212521]" style={{ fontFamily: 'var(--font-display)' }}>
            {project.name}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm text-[#606560]">{project.description ?? 'No description yet.'}</p>
          <div className="mt-4 flex items-center gap-2 text-xs">
            <span className="rounded-full border border-[#d8ccb4] bg-[#fff9ea] px-2 py-1 text-[#5f5a4c]">
              {project.taskCount} tasks
            </span>
            <span className="rounded-full border border-[#e2b7b0] bg-[#fff1ee] px-2 py-1 text-[#9a3e34]">
              {project.overdueCount} overdue
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
