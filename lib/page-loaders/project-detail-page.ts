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
  currentUserId: string;
  project: NonNullable<Awaited<ReturnType<typeof getProjectById>>>;
  tasks: Awaited<ReturnType<typeof getProjectTasks>>;
  assignees: Awaited<ReturnType<typeof loadProjectAssignees>>[string];
  workflowOptions: ReturnType<typeof buildProjectWorkflowOptions>;
  setupGuide: ProjectSetupGuide | null;
  selectedTaskPanel: Awaited<ReturnType<typeof loadTaskDrawerDataForTask>> | null;
  selectedTaskMode: 'details' | 'completed';
  recurringNotice: string | null;
  templateAuthoring:
    | {
        workspaceId: string;
        projectId: string;
        actorUserId: string;
      }
    | null;
};

export async function loadProjectDetailPageData(
  projectId: string,
  search: { task?: string; completed?: string; recurring?: string }
): Promise<ProjectDetailPageData | null> {
  const { user, supabase } = await requireUser();
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
    currentUserId: user.id,
    project,
    tasks,
    assignees: assigneesByProject[project.id] ?? [],
    workflowOptions: buildProjectWorkflowOptions(statuses, sections),
    setupGuide: buildProjectSetupGuide(tasks.length),
    selectedTaskPanel,
    selectedTaskMode: search.completed === '1' ? 'completed' : 'details',
    recurringNotice:
      search.recurring === '1'
        ? 'The recurring series already generated the next task.'
        : null,
    templateAuthoring:
      project.privacy === 'workspace_visible'
        ? {
            workspaceId: project.workspaceId,
            projectId: project.id,
            actorUserId: user.id
          }
        : null
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
