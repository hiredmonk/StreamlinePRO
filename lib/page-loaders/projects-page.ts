import { requireUser } from '@/lib/auth';
import {
  getProjectsForWorkspace,
  getWorkspacesForUser,
  type ProjectSummary,
  type WorkspaceSummary
} from '@/lib/domain/projects/queries';
import { getProjectTemplateSummaries } from '@/lib/domain/projects/template-queries';
import type { ProjectTemplateSummary } from '@/lib/contracts/project-templates';
import {
  loadWorkspaceTeamAccessData,
  type WorkspaceTeamAccessData
} from '@/lib/page-loaders/workspace-team-access';
import {
  buildWorkspaceOnboarding,
  type WorkspaceOnboardingState
} from '@/lib/view-models/onboarding';

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
      currentUserId: string;
      workspaces: WorkspaceSummary[];
      activeWorkspace: WorkspaceSummary;
      projects: ProjectSummary[];
      templates: ProjectTemplateSummary[];
      teamAccess: WorkspaceTeamAccessData | null;
      onboarding: WorkspaceOnboardingState | null;
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

  const [projectList, templates, loadedTeamAccess] = await Promise.all([
    getProjectsForWorkspace(supabase, activeWorkspace.id),
    getProjectTemplateSummaries(supabase, activeWorkspace.id),
    activeWorkspace.role === 'admin'
      ? loadWorkspaceTeamAccessData(supabase, activeWorkspace.id).catch(() => null)
      : Promise.resolve(null)
  ]);

  return {
    mode: 'workspace-detail',
    currentUserId: user.id,
    workspaces,
    activeWorkspace,
    projects: projectList,
    templates,
    teamAccess: loadedTeamAccess,
    onboarding: buildWorkspaceOnboarding({
      isAdmin: activeWorkspace.role === 'admin',
      projects: projectList.map((project) => ({
        id: project.id,
        name: project.name,
        taskCount: project.taskCount
      })),
      teamAccess: loadedTeamAccess
    })
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
