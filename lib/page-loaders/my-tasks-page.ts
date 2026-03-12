import { requireUser } from '@/lib/auth';
import { getProjectsForWorkspace, getWorkspacesForUser } from '@/lib/domain/projects/queries';
import { getMyTasks, type MyTasksGroups } from '@/lib/domain/tasks/queries';
import { loadTaskDrawerData } from '@/lib/page-loaders/task-drawer';

type StatusRow = {
  id: string;
  project_id: string;
  name: string;
  color: string;
};

type SectionRow = {
  id: string;
  project_id: string;
  name: string;
};

export type MyTasksPageData =
  | {
      mode: 'no-workspaces';
    }
  | {
      mode: 'ready';
      groups: MyTasksGroups;
      quickAddProjects: Array<{ id: string; name: string }>;
      statusesByProject: Record<string, Array<{ id: string; name: string; color: string }>>;
      sectionsByProject: Record<string, Array<{ id: string; name: string }>>;
      selectedTaskPanel: Awaited<ReturnType<typeof loadTaskDrawerData>>;
      hasAnyTask: boolean;
    };

export async function loadMyTasksPageData(search: { task?: string }): Promise<MyTasksPageData> {
  const selectedTaskId = search.task;
  const { user, supabase } = await requireUser();
  const workspaces = await getWorkspacesForUser(supabase, user.id);

  if (!workspaces.length) {
    return { mode: 'no-workspaces' };
  }

  const activeWorkspace = workspaces[0];
  const projects = await getProjectsForWorkspace(supabase, activeWorkspace.id);
  const projectIds = projects.map((project) => project.id);

  const [statusRows, sectionRows, groups, selectedTaskPanel] = await Promise.all([
    loadProjectStatusRows(supabase, projectIds),
    loadProjectSectionRows(supabase, projectIds),
    getMyTasks(supabase, user.id),
    selectedTaskId ? loadTaskDrawerData(supabase, selectedTaskId) : Promise.resolve(null)
  ]);

  const { statusesByProject, sectionsByProject } = buildProjectTaxonomyMaps(statusRows, sectionRows);
  const hasAnyTask =
    groups.today.length > 0 ||
    groups.overdue.length > 0 ||
    Object.values(groups.upcoming).some((tasks) => tasks.length > 0);

  return {
    mode: 'ready',
    groups,
    quickAddProjects: projects.map((project) => ({ id: project.id, name: project.name })),
    statusesByProject,
    sectionsByProject,
    selectedTaskPanel,
    hasAnyTask
  };
}

export function buildProjectTaxonomyMaps(statusRows: StatusRow[], sectionRows: SectionRow[]) {
  const statusesByProject: Record<string, Array<{ id: string; name: string; color: string }>> = {};
  const sectionsByProject: Record<string, Array<{ id: string; name: string }>> = {};

  statusRows.forEach((status) => {
    statusesByProject[status.project_id] ??= [];
    statusesByProject[status.project_id].push({
      id: status.id,
      name: status.name,
      color: status.color
    });
  });

  sectionRows.forEach((section) => {
    sectionsByProject[section.project_id] ??= [];
    sectionsByProject[section.project_id].push({
      id: section.id,
      name: section.name
    });
  });

  return {
    statusesByProject,
    sectionsByProject
  };
}

async function loadProjectStatusRows(supabase: Awaited<ReturnType<typeof requireUser>>['supabase'], projectIds: string[]) {
  if (!projectIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('project_statuses')
    .select('id, project_id, name, color, sort_order')
    .in('project_id', projectIds)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as StatusRow[];
}

async function loadProjectSectionRows(supabase: Awaited<ReturnType<typeof requireUser>>['supabase'], projectIds: string[]) {
  if (!projectIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from('project_sections')
    .select('id, project_id, name, sort_order')
    .in('project_id', projectIds)
    .order('sort_order', { ascending: true });

  if (error) {
    throw error;
  }

  return (data ?? []) as SectionRow[];
}
