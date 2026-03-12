import { requireUser } from '@/lib/auth';
import {
  getProjectsForWorkspace,
  getWorkspacesForUser,
  type ProjectSummary,
  type WorkspaceSummary
} from '@/lib/domain/projects/queries';

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

  const projects = await getProjectsForWorkspace(supabase, activeWorkspace.id);

  return {
    mode: 'workspace-detail',
    workspaces,
    activeWorkspace,
    projects
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
