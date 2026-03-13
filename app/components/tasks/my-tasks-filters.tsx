'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { MyTasksFilterState } from '@/lib/page-loaders/my-tasks-page';

type MyTasksFiltersProps = {
  filters: MyTasksFilterState;
};

const QUICK_FILTERS: Array<{
  value: NonNullable<MyTasksFilterState['selectedQuickFilter']>;
  label: string;
}> = [
  { value: 'waiting', label: 'Waiting' },
  { value: 'due-this-week', label: 'Due this week' },
  { value: 'unassigned', label: 'Unassigned' }
];

export function MyTasksFilters({ filters }: MyTasksFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateSearch(mutator: (params: URLSearchParams) => void) {
    const next = new URLSearchParams(searchParams.toString());
    mutator(next);
    const query = next.toString();
    const href = query ? `${pathname}?${query}` : pathname;
    router.push(href as never);
  }

  return (
    <section className="glass-panel space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-3">
        {filters.workspaceOptions.length > 1 ? (
          <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-[#6c6b63]">
            Workspace
            <select
              value={filters.activeWorkspaceId}
              onChange={(event) =>
                updateSearch((params) => {
                  params.set('workspace', event.currentTarget.value);
                  params.delete('project');
                  params.delete('status');
                  params.delete('quick');
                  params.delete('task');
                  params.delete('completed');
                  params.delete('recurring');
                })
              }
              className="h-10 rounded-xl border border-[#d8ceb6] bg-white px-3 text-sm normal-case tracking-normal text-[#2d332f]"
            >
              {filters.workspaceOptions.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-[#6c6b63]">
          Project
          <select
            value={filters.selectedProjectId ?? ''}
            onChange={(event) =>
              updateSearch((params) => {
                params.set('workspace', filters.activeWorkspaceId);
                if (event.currentTarget.value) {
                  params.set('project', event.currentTarget.value);
                } else {
                  params.delete('project');
                }
                params.delete('status');
                params.delete('task');
                params.delete('completed');
                params.delete('recurring');
              })
            }
            className="h-10 min-w-[180px] rounded-xl border border-[#d8ceb6] bg-white px-3 text-sm normal-case tracking-normal text-[#2d332f]"
          >
            <option value="">All projects</option>
            {filters.projectOptions.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-1 text-xs uppercase tracking-[0.12em] text-[#6c6b63]">
          Status
          <select
            value={filters.selectedStatusId ?? ''}
            onChange={(event) =>
              updateSearch((params) => {
                params.set('workspace', filters.activeWorkspaceId);
                if (event.currentTarget.value) {
                  params.set('status', event.currentTarget.value);
                } else {
                  params.delete('status');
                }
                params.delete('task');
                params.delete('completed');
                params.delete('recurring');
              })
            }
            className="h-10 min-w-[180px] rounded-xl border border-[#d8ceb6] bg-white px-3 text-sm normal-case tracking-normal text-[#2d332f]"
          >
            <option value="">All statuses</option>
            {filters.statusOptions.map((status) => (
              <option key={status.id} value={status.id}>
                {status.label}
              </option>
            ))}
          </select>
        </label>

        {filters.hasActiveFilters ? (
          <button
            type="button"
            onClick={() =>
              updateSearch((params) => {
                params.set('workspace', filters.activeWorkspaceId);
                params.delete('project');
                params.delete('status');
                params.delete('quick');
                params.delete('task');
                params.delete('completed');
                params.delete('recurring');
              })
            }
            className="mt-5 h-10 rounded-xl border border-[#d8ceb6] bg-[#fff8ec] px-4 text-sm font-semibold text-[#514836] transition hover:bg-[#f6ead5]"
          >
            Clear filters
          </button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((filter) => {
          const active = filters.selectedQuickFilter === filter.value;

          return (
            <button
              key={filter.value}
              type="button"
              onClick={() =>
                updateSearch((params) => {
                  params.set('workspace', filters.activeWorkspaceId);
                  if (active) {
                    params.delete('quick');
                  } else {
                    params.set('quick', filter.value);
                  }
                  params.delete('task');
                  params.delete('completed');
                  params.delete('recurring');
                })
              }
              className={cn(
                'rounded-full border px-3 py-1.5 text-sm font-semibold transition',
                active
                  ? 'border-[#d65443] bg-[#fff1ee] text-[#9f2d21]'
                  : 'border-[#d8ceb6] bg-white text-[#494c48] hover:bg-[#faf1df]'
              )}
            >
              {filter.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
