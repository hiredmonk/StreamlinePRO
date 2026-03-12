import { requireUser } from '@/lib/auth';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';

export type SearchTask = {
  id: string;
  title: string;
  project_id: string;
  projects: { name: string } | { name: string }[] | null;
};

export async function loadSearchPageData(search: { q?: string }) {
  const query = (search.q ?? '').trim();
  const { supabase } = await requireUser();
  const results = query ? await searchTasksByTitle(supabase, query) : [];

  return {
    query,
    results,
    groupedResults: groupSearchResultsByProject(results)
  };
}

export async function searchTasksByTitle(
  supabase: AppSupabaseClient,
  query: string
): Promise<SearchTask[]> {
  if (!query) {
    return [];
  }

  const { data, error } = await supabase
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
    .limit(100);

  if (error) {
    throw error;
  }

  return (data ?? []) as unknown as SearchTask[];
}

export function groupSearchResultsByProject(results: SearchTask[]) {
  return results.reduce<Record<string, SearchTask[]>>((acc, task) => {
    const project = Array.isArray(task.projects) ? task.projects[0] : task.projects;
    const key = project?.name ?? 'Unknown project';
    acc[key] ??= [];
    acc[key].push(task);
    return acc;
  }, {});
}
