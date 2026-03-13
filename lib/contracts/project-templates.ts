export interface ProjectTemplateTaskSnapshot {
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | null;
  sectionName: string | null;
  statusName: string | null;
}

export interface ProjectTemplateSnapshot {
  statuses: Array<{
    name: string;
    color: string;
    isDone: boolean;
    sortOrder: number;
  }>;
  sections: Array<{
    name: string;
    sortOrder: number;
  }>;
  tasks: ProjectTemplateTaskSnapshot[];
}

export interface ProjectTemplateSummary {
  id: string;
  workspaceId: string;
  sourceProjectId: string | null;
  name: string;
  description: string | null;
  includeTasks: boolean;
  taskCount: number;
  createdBy: string;
  createdAt: string;
}
