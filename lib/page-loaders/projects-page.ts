import { requireUser } from '@/lib/auth';
import {
  getProjectsForWorkspace,
  getWorkspacesForUser,
  type ProjectSummary,
  type WorkspaceSummary
} from '@/lib/domain/projects/queries';
import {
  loadWorkspaceTeamAccessData,
  type WorkspaceTeamAccessData
} from '@/lib/page-loaders/workspace-team-access';

export type ProjectsPageState =
  | {
      mode: 'no-workspaces';
    }
  | {
      mode: 'create-workspace';
      workspaces: WorkspaceSummary[];
    }
  | {
      mode: 'workspace-directory';
      workspaces: WorkspaceSummary[];
    }
  | {
      mode: 'workspace-detail';
      workspaces: WorkspaceSummary[];
      activeWorkspace: WorkspaceSummary;
      projects: ProjectSummary[];
      teamAccess: WorkspaceTeamAccessData | null;
    };

export async function loadProjectsPageData(search: { workspace?: string }): Promise<ProjectsPageState> {
  const { user, supabase } = await requireUser();
  const workspaces = await getWorkspacesForUser(supabase, user.id);
  const workspaceParam = search.workspace;

  if (!workspaces.length) {
    return { mode: 'no-workspaces' };
  }

  if (workspaceParam === 'new') {
    return {
      mode: 'create-workspace',
      workspaces
    };
  }

  const activeWorkspace = resolveProjectsPageState(workspaces, workspaceParam);

  if (!activeWorkspace) {
    return {
      mode: 'workspace-directory',
      workspaces
    };
  }

  const [projects, teamAccess] = await Promise.all([
    getProjectsForWorkspace(supabase, activeWorkspace.id),
    activeWorkspace.role === 'admin'
      ? loadWorkspaceTeamAccessData(supabase, activeWorkspace.id).catch(() => null)
      : Promise.resolve(null)
  ]);

  return {
    mode: 'workspace-detail',
    workspaces,
    activeWorkspace,
    projects,
    teamAccess
  };
}

export function resolveProjectsPageState(
  workspaces: WorkspaceSummary[],
  workspaceParam?: string
) {
  if (!workspaceParam) {
    return null;
  }

  return workspaces.find((workspace) => workspace.id === workspaceParam) ?? null;
}
