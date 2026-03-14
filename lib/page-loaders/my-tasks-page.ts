import { requireUser } from '@/lib/auth';
import { getProjectsForWorkspace, getWorkspacesForUser } from '@/lib/domain/projects/queries';
import {
  getMyTasks,
  type MyTasksGroups,
  type MyTasksQuickFilter
} from '@/lib/domain/tasks/queries';
import { loadProjectAssignees, type AssigneeOption } from '@/lib/page-loaders/project-assignees';
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
      currentUserId: string;
      groups: MyTasksGroups;
      filterState: MyTasksFilterState;
      quickAddProjects: Array<{ id: string; name: string }>;
      statusesByProject: Record<string, Array<{ id: string; name: string; color: string }>>;
      sectionsByProject: Record<string, Array<{ id: string; name: string }>>;
      assigneesByProject: Record<string, AssigneeOption[]>;
      selectedTaskPanel: Awaited<ReturnType<typeof loadTaskDrawerData>>;
      selectedTaskMode: 'details' | 'completed';
      recurringNotice: string | null;
      hasAnyTask: boolean;
    };

export type MyTasksSearch = {
  workspace?: string;
  project?: string;
  status?: string;
  quick?: MyTasksQuickFilter;
  task?: string;
  completed?: '1';
  recurring?: '1';
  shortcut?: string;
};

export type MyTasksFilterState = {
  activeWorkspaceId: string;
  workspaceOptions: Array<{ id: string; name: string }>;
  projectOptions: Array<{ id: string; name: string }>;
  statusOptions: Array<{ id: string; name: string; label: string }>;
  selectedProjectId: string | null;
  selectedStatusId: string | null;
  selectedQuickFilter: MyTasksQuickFilter | null;
  hasActiveFilters: boolean;
};

export async function loadMyTasksPageData(search: MyTasksSearch): Promise<MyTasksPageData> {
  const selectedTaskId = search.task;
  const { user, supabase } = await requireUser();
  const workspaces = await getWorkspacesForUser(supabase, user.id);

  if (!workspaces.length) {
    return { mode: 'no-workspaces' };
  }

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === search.workspace) ?? workspaces[0];
  const projects = await getProjectsForWorkspace(supabase, activeWorkspace.id);
  const projectIds = projects.map((project) => project.id);
  const [statusRows, sectionRows, assigneesByProject, selectedTaskPanelCandidate] = await Promise.all([
    loadProjectStatusRows(supabase, projectIds),
    loadProjectSectionRows(supabase, projectIds),
    loadProjectAssignees(supabase, projectIds),
    selectedTaskId ? loadTaskDrawerData(supabase, selectedTaskId) : Promise.resolve(null)
  ]);

  const projectIdSet = new Set(projectIds);
  const selectedProjectId = projectIdSet.has(search.project ?? '') ? search.project ?? null : null;
  const selectedQuickFilter = parseQuickFilter(search.quick);
  const validStatusIds = new Set(statusRows.map((status) => status.id));
  const selectedStatusId = validStatusIds.has(search.status ?? '') ? search.status ?? null : null;
  const waitingStatusIds = statusRows
    .filter((status) => normalizeStatusName(status.name) === 'waiting')
    .map((status) => status.id);
  const filteredStatusIds = resolveStatusFilterIds({
    selectedStatusId,
    selectedQuickFilter,
    waitingStatusIds
  });
  const groups = await getMyTasks(supabase, {
    userId: user.id,
    projectIds,
    projectId: selectedProjectId,
    statusIds: filteredStatusIds,
    quickFilter: selectedQuickFilter
  });
  const selectedTaskPanel =
    selectedTaskPanelCandidate && projectIdSet.has(selectedTaskPanelCandidate.task.project_id)
      ? selectedTaskPanelCandidate
      : null;

  const { statusesByProject, sectionsByProject } = buildProjectTaxonomyMaps(statusRows, sectionRows);
  const hasAnyTask =
    groups.today.length > 0 ||
    groups.overdue.length > 0 ||
    Object.values(groups.upcoming).some((tasks) => tasks.length > 0);

  return {
    mode: 'ready',
    currentUserId: user.id,
    groups,
    filterState: buildMyTasksFilterState({
      workspaces,
      activeWorkspaceId: activeWorkspace.id,
      projects,
      statusRows,
      selectedProjectId,
      selectedStatusId,
      selectedQuickFilter
    }),
    quickAddProjects: projects.map((project) => ({ id: project.id, name: project.name })),
    statusesByProject,
    sectionsByProject,
    assigneesByProject,
    selectedTaskPanel,
    selectedTaskMode: search.completed === '1' ? 'completed' : 'details',
    recurringNotice:
      search.recurring === '1'
        ? 'The recurring series already generated the next task.'
        : null,
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

function buildMyTasksFilterState(input: {
  workspaces: Array<{ id: string; name: string }>;
  activeWorkspaceId: string;
  projects: Array<{ id: string; name: string }>;
  statusRows: StatusRow[];
  selectedProjectId: string | null;
  selectedStatusId: string | null;
  selectedQuickFilter: MyTasksQuickFilter | null;
}): MyTasksFilterState {
  const projectNameById = new Map(input.projects.map((project) => [project.id, project.name]));
  const shouldPrefixStatusLabel =
    input.selectedProjectId === null && new Set(input.statusRows.map((status) => status.project_id)).size > 1;

  return {
    activeWorkspaceId: input.activeWorkspaceId,
    workspaceOptions: input.workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name
    })),
    projectOptions: input.projects.map((project) => ({
      id: project.id,
      name: project.name
    })),
    statusOptions: input.statusRows
      .filter((status) => input.selectedProjectId === null || status.project_id === input.selectedProjectId)
      .map((status) => ({
        id: status.id,
        name: status.name,
        label: shouldPrefixStatusLabel
          ? `${projectNameById.get(status.project_id) ?? 'Project'} - ${status.name}`
          : status.name
      })),
    selectedProjectId: input.selectedProjectId,
    selectedStatusId: input.selectedStatusId,
    selectedQuickFilter: input.selectedQuickFilter,
    hasActiveFilters: Boolean(
      input.selectedProjectId || input.selectedStatusId || input.selectedQuickFilter
    )
  };
}

function resolveStatusFilterIds(input: {
  selectedStatusId: string | null;
  selectedQuickFilter: MyTasksQuickFilter | null;
  waitingStatusIds: string[];
}) {
  if (input.selectedQuickFilter === 'waiting') {
    if (input.selectedStatusId) {
      return input.waitingStatusIds.includes(input.selectedStatusId) ? [input.selectedStatusId] : [];
    }

    return input.waitingStatusIds;
  }

  if (input.selectedStatusId) {
    return [input.selectedStatusId];
  }

  return undefined;
}

function parseQuickFilter(value: string | undefined): MyTasksQuickFilter | null {
  if (value === 'waiting' || value === 'due-this-week' || value === 'unassigned') {
    return value;
  }

  return null;
}

function normalizeStatusName(name: string) {
  return name.trim().toLowerCase();
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
