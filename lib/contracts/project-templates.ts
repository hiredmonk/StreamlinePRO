import type { ActionResult } from '@/lib/actions/types';

export interface TemplateStatusDraft {
  name: string;
  color: string;
  isDone: boolean;
  sortOrder: number;
}

export interface TemplateSectionDraft {
  name: string;
  sortOrder: number;
}

export interface TemplateTaskDraft {
  title: string;
  description?: string;
  statusName?: string;
  sectionName?: string;
  dueOffsetDays?: number;
}

export interface CreateProjectTemplateInput {
  workspaceId: string;
  sourceProjectId: string;
  name: string;
  includeTasks: boolean;
  actorUserId: string;
}

export interface UpdateProjectTemplateInput {
  templateId: string;
  name?: string;
  includeTasks?: boolean;
  actorUserId: string;
}

export interface CreateProjectFromTemplateInput {
  workspaceId: string;
  templateId: string;
  projectName: string;
  dueAnchorDate?: string | null;
  actorUserId: string;
}

export interface ListProjectTemplatesInput {
  workspaceId: string;
  actorUserId: string;
}

export interface ProjectTemplateSummary {
  id: string;
  workspaceId: string;
  name: string;
  includeTasks: boolean;
  statusCount: number;
  sectionCount: number;
  taskCount: number;
  createdBy: string;
  createdAt: string;
}

export interface ProjectTemplateDetail extends ProjectTemplateSummary {
  statuses: TemplateStatusDraft[];
  sections: TemplateSectionDraft[];
  tasks: TemplateTaskDraft[];
}

export interface CreateProjectTemplateOutput {
  template: ProjectTemplateSummary;
}

export interface UpdateProjectTemplateOutput {
  template: ProjectTemplateSummary;
}

export interface CreateProjectFromTemplateOutput {
  projectId: string;
  workspaceId: string;
  templateId: string;
  createdStatusCount: number;
  createdSectionCount: number;
  createdTaskCount: number;
}

export interface ListProjectTemplatesOutput {
  templates: ProjectTemplateSummary[];
}

export type CreateProjectTemplateAction = (
  input: CreateProjectTemplateInput
) => Promise<ActionResult<CreateProjectTemplateOutput>>;

export type UpdateProjectTemplateAction = (
  input: UpdateProjectTemplateInput
) => Promise<ActionResult<UpdateProjectTemplateOutput>>;

export type CreateProjectFromTemplateAction = (
  input: CreateProjectFromTemplateInput
) => Promise<ActionResult<CreateProjectFromTemplateOutput>>;

export type ListProjectTemplatesQuery = (
  input: ListProjectTemplatesInput
) => Promise<ListProjectTemplatesOutput>;
