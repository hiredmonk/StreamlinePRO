import Link from 'next/link';
import { EmptyState } from '@/app/components/ui/empty-state';
import { CreateProjectForm } from '@/app/components/projects/create-project-form';
import { CreateWorkspaceForm } from '@/app/components/projects/create-workspace-form';
import { ProjectCardGrid } from '@/app/components/projects/project-card-grid';
import { requireUser } from '@/lib/auth';
import { getProjectsForWorkspace, getWorkspacesForUser } from '@/lib/domain/projects/queries';

export default async function ProjectsPage({
  searchParams
}: {
  searchParams: Promise<{ workspace?: string }>;
}) {
  const params = await searchParams;
  const { user, supabase } = await requireUser();
  const workspaces = await getWorkspacesForUser(supabase, user.id);
  const workspaceParam = params.workspace;

  if (!workspaces.length) {
    return <CreateWorkspaceForm />;
  }

  if (workspaceParam === 'new') {
    return (
      <div className="space-y-4">
        <section className="glass-panel flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#6e6a63]">Workspace setup</p>
            <h1
              className="text-3xl font-semibold text-[#1f241f]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Create workspace
            </h1>
          </div>
          <Link
            href="/projects"
            className="rounded-full border border-[#dfd7c1] bg-[#fff8ed] px-4 py-2 text-sm font-semibold text-[#2f342f] transition hover:border-[#d8ba94] hover:bg-[#faeddb]"
          >
            All workspaces
          </Link>
        </section>
        <CreateWorkspaceForm
          title="Create another workspace"
          description="Set up a separate workspace for a new team, client, or initiative."
        />
      </div>
    );
  }

  const activeWorkspace = workspaceParam
    ? workspaces.find((workspace) => workspace.id === workspaceParam) ?? null
    : null;

  if (!activeWorkspace) {
    return (
      <div className="space-y-4">
        <section className="glass-panel flex items-center justify-between gap-3 p-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#6e6a63]">Workspace directory</p>
            <h1
              className="text-3xl font-semibold text-[#1f241f]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              All workspaces
            </h1>
          </div>
          <Link
            href="/projects?workspace=new"
            className="rounded-full border border-[#dfd7c1] bg-[#fff8ed] px-4 py-2 text-sm font-semibold text-[#2f342f] transition hover:border-[#d8ba94] hover:bg-[#faeddb]"
          >
            Create workspace
          </Link>
        </section>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/projects?workspace=${workspace.id}`}
              className="glass-panel block p-5 transition hover:-translate-y-0.5 hover:border-[#d8b48d]"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-[#7d766c]">{workspace.role}</p>
              <h2
                className="mt-2 text-2xl font-semibold text-[#212521]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {workspace.name}
              </h2>
              <p className="mt-2 text-sm text-[#606560]">Open projects</p>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  const projects = await getProjectsForWorkspace(supabase, activeWorkspace.id);

  return (
    <div className="space-y-4">
      <section className="glass-panel flex items-center justify-between gap-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#6e6a63]">Active workspace</p>
          <h1
            className="text-3xl font-semibold text-[#1f241f]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {activeWorkspace.name}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/projects"
            className="rounded-full border border-[#dfd7c1] bg-[#fff8ed] px-4 py-2 text-sm font-semibold text-[#2f342f] transition hover:border-[#d8ba94] hover:bg-[#faeddb]"
          >
            All workspaces
          </Link>
          <Link
            href="/projects?workspace=new"
            className="rounded-full border border-[#dfd7c1] bg-[#fff8ed] px-4 py-2 text-sm font-semibold text-[#2f342f] transition hover:border-[#d8ba94] hover:bg-[#faeddb]"
          >
            New workspace
          </Link>
        </div>
      </section>

      <CreateProjectForm workspaceId={activeWorkspace.id} />

      {projects.length ? (
        <ProjectCardGrid projects={projects} />
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create your first project above. Sections and statuses are initialized automatically."
        />
      )}
    </div>
  );
}
