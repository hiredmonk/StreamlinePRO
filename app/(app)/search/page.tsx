import Link from 'next/link';
import { requireUser } from '@/lib/auth';

type SearchTask = {
  id: string;
  title: string;
  project_id: string;
  projects: { name: string } | { name: string }[] | null;
};

export default async function SearchPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? '').trim();
  const { supabase } = await requireUser();

  const { data: results, error } = query
    ? await supabase
        .from('tasks')
        .select(
          `
          id,
          title,
          project_id,
          projects!tasks_project_id_fkey (
            name
          )
        `
        )
        .ilike('title', `%${query}%`)
        .order('updated_at', { ascending: false })
        .limit(100)
    : { data: [], error: null };

  if (error) {
    throw error;
  }

  const normalizedResults = (results ?? []) as SearchTask[];

  const groupedResults = normalizedResults.reduce<Record<string, SearchTask[]>>((acc, task) => {
    const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
    const key = project?.name ?? 'Unknown project';
    acc[key] ??= [];
    acc[key].push(task);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      <section className="glass-panel p-5">
        <p className="text-xs uppercase tracking-[0.2em] text-[#6e6a63]">Search</p>
        <h1 className="text-3xl font-semibold text-[#1f241f]" style={{ fontFamily: 'var(--font-display)' }}>
          Task Finder
        </h1>
        <form className="mt-4 flex gap-2" action="/search">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search task titles"
            className="h-10 w-full rounded-xl border border-[#d9cfb6] bg-[#fffdf8] px-3 text-sm"
          />
          <button type="submit" className="rounded-xl border border-[#cb3f2f] bg-[#dd4b39] px-4 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </section>

      {query ? (
        <section className="space-y-3">
          <p className="text-sm text-[#5d625d]">{normalizedResults.length} results for "{query}"</p>
          <div className="space-y-4">
            {Object.entries(groupedResults).map(([projectName, projectTasks]) => (
              <section key={projectName} className="space-y-2">
                <h2 className="text-xs font-semibold uppercase tracking-[0.18em] text-[#696c68]">
                  {projectName}
                </h2>
                <ul className="space-y-2">
                  {(projectTasks ?? []).map((task) => (
                    <li key={task.id} className="glass-panel p-4">
                      <Link
                        href={`/projects/${task.project_id}?task=${task.id}`}
                        className="text-[17px] font-semibold text-[#232724] hover:text-[#ab3628]"
                      >
                        {task.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
