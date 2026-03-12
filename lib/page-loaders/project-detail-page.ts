import { requireUser } from '@/lib/auth';
import {
  getProjectById,
  getProjectSections,
  getProjectStatuses
} from '@/lib/domain/projects/queries';
import { getTaskById, getProjectTasks } from '@/lib/domain/tasks/queries';
import { loadProjectAssignees } from '@/lib/page-loaders/project-assignees';
import { loadTaskDrawerDataForTask } from '@/lib/page-loaders/task-drawer';
import { buildProjectSetupGuide, type ProjectSetupGuide } from '@/lib/view-models/onboarding';

export type ProjectDetailPageData = {
  project: NonNullable<Awaited<ReturnType<typeof getProjectById>>>;
  tasks: Awaited<ReturnType<typeof getProjectTasks>>;
  assignees: Awaited<ReturnType<typeof loadProjectAssignees>>[string];
  workflowOptions: ReturnType<typeof buildProjectWorkflowOptions>;
  setupGuide: ProjectSetupGuide | null;
  selectedTaskPanel: Awaited<ReturnType<typeof loadTaskDrawerDataForTask>> | null;
};

export async function loadProjectDetailPageData(
  projectId: string,
  search: { task?: string }
): Promise<ProjectDetailPageData | null> {
  const { supabase } = await requireUser();
  const project = await getProjectById(supabase, projectId);

  if (!project) {
    return null;
  }

  const [statuses, sections, tasks, selectedTaskCandidate, assigneesByProject] = await Promise.all([
    getProjectStatuses(supabase, project.id),
    getProjectSections(supabase, project.id),
    getProjectTasks(supabase, project.id),
    search.task ? getTaskById(supabase, search.task) : Promise.resolve(null),
    loadProjectAssignees(supabase, [project.id])
  ]);

  const selectedTaskPanel =
    selectedTaskCandidate && selectedTaskCandidate.project_id === project.id
      ? await loadTaskDrawerDataForTask(supabase, selectedTaskCandidate)
      : null;

  return {
    project,
    tasks,
    assignees: assigneesByProject[project.id] ?? [],
    workflowOptions: buildProjectWorkflowOptions(statuses, sections),
    setupGuide: buildProjectSetupGuide(tasks.length),
    selectedTaskPanel
  };
}

export function buildProjectWorkflowOptions(
  statuses: Array<{ id: string; name: string; color: string; is_done: boolean }>,
  sections: Array<{ id: string; name: string }>
) {
  return {
    taskStatuses: statuses.map((status) => ({
      id: status.id,
      name: status.name
    })),
    taskSections: sections.map((section) => ({
      id: section.id,
      name: section.name
    })),
    boardStatuses: statuses.map((status) => ({
      id: status.id,
      name: status.name,
      color: status.color
    })),
    managerStatuses: statuses.map((status) => ({
      id: status.id,
      name: status.name,
      color: status.color,
      is_done: status.is_done
    }))
  };
}
