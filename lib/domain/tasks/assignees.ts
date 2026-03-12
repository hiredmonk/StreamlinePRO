import type { AppSupabaseClient } from '@/lib/supabase/client-types';

export type ProjectAssignmentScope = {
  projectId: string;
  workspaceId: string;
  privacy: 'workspace_visible' | 'private';
  assignableUserIds: string[];
};

type ProjectRow = {
  id: string;
  workspace_id: string;
  privacy: 'workspace_visible' | 'private';
};

type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
};

type ProjectMemberRow = {
  project_id: string;
  user_id: string;
};

export async function getProjectAssignmentScopes(
  supabase: AppSupabaseClient,
  projectIds: string[]
): Promise<Record<string, ProjectAssignmentScope>> {
  const uniqueProjectIds = [...new Set(projectIds.filter(Boolean))];
  if (!uniqueProjectIds.length) {
    return {};
  }

  const { data: projects, error: projectError } = await supabase
    .from('projects')
    .select('id, workspace_id, privacy')
    .in('id', uniqueProjectIds);

  if (projectError) {
    throw projectError;
  }

  const projectRows = (projects ?? []) as ProjectRow[];
  if (!projectRows.length) {
    return {};
  }

  const workspaceIds = [...new Set(projectRows.map((project) => project.workspace_id))];

  const [{ data: workspaceMembers, error: workspaceMemberError }, { data: projectMembers, error: projectMemberError }] =
    await Promise.all([
      supabase
        .from('workspace_members')
        .select('workspace_id, user_id')
        .in('workspace_id', workspaceIds),
      supabase
        .from('project_members')
        .select('project_id, user_id')
        .in('project_id', uniqueProjectIds)
    ]);

  if (workspaceMemberError) {
    throw workspaceMemberError;
  }

  if (projectMemberError) {
    throw projectMemberError;
  }

  const workspaceMembersByWorkspace = new Map<string, Set<string>>();
  for (const member of (workspaceMembers ?? []) as WorkspaceMemberRow[]) {
    workspaceMembersByWorkspace.set(
      member.workspace_id,
      workspaceMembersByWorkspace.get(member.workspace_id) ?? new Set<string>()
    );
    workspaceMembersByWorkspace.get(member.workspace_id)?.add(member.user_id);
  }

  const projectMembersByProject = new Map<string, Set<string>>();
  for (const member of (projectMembers ?? []) as ProjectMemberRow[]) {
    projectMembersByProject.set(
      member.project_id,
      projectMembersByProject.get(member.project_id) ?? new Set<string>()
    );
    projectMembersByProject.get(member.project_id)?.add(member.user_id);
  }

  return Object.fromEntries(
    projectRows.map((project) => {
      const assignableUserIds =
        project.privacy === 'workspace_visible'
          ? [...(workspaceMembersByWorkspace.get(project.workspace_id) ?? new Set<string>())]
          : [...(projectMembersByProject.get(project.id) ?? new Set<string>())];

      return [
        project.id,
        {
          projectId: project.id,
          workspaceId: project.workspace_id,
          privacy: project.privacy,
          assignableUserIds
        }
      ] as const;
    })
  );
}

export async function getProjectAssignmentScope(supabase: AppSupabaseClient, projectId: string) {
  const scopes = await getProjectAssignmentScopes(supabase, [projectId]);
  return scopes[projectId] ?? null;
}

export function isAssigneeAllowed(scope: ProjectAssignmentScope | null, assigneeId: string | null | undefined) {
  if (!assigneeId) {
    return true;
  }

  if (!scope) {
    return false;
  }

  return scope.assignableUserIds.includes(assigneeId);
}
