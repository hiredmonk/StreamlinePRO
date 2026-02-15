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

  if (!workspaces.length) {
    return <CreateWorkspaceForm />;
  }

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === params.workspace) ?? workspaces[0];

  const projects = await getProjectsForWorkspace(supabase, activeWorkspace.id);

  return (
    <div className="space-y-4">
      <section className="glass-panel p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-[#6e6a63]">Active workspace</p>
        <h1 className="text-3xl font-semibold text-[#1f241f]" style={{ fontFamily: 'var(--font-display)' }}>
          {activeWorkspace.name}
        </h1>
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
