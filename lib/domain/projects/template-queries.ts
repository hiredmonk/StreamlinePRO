import type { AppSupabaseClient } from '@/lib/supabase/client-types';
import type {
  ProjectTemplateSummary,
  ProjectTemplateSnapshot
} from '@/lib/contracts/project-templates';

type TemplateRow = {
  id: string;
  workspace_id: string;
  source_project_id: string | null;
  name: string;
  description: string | null;
  include_tasks: boolean;
  snapshot_json: ProjectTemplateSnapshot;
  created_by: string;
  created_at: string;
};

export async function getProjectTemplateSummaries(
  supabase: AppSupabaseClient,
  workspaceId: string
): Promise<ProjectTemplateSummary[]> {
  const { data: templates, error } = await supabase
    .from('project_templates')
    .select('id, workspace_id, source_project_id, name, description, include_tasks, snapshot_json, created_by, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  if (!templates?.length) {
    return [];
  }

  return (templates as unknown as TemplateRow[]).map((template) => ({
    id: template.id,
    workspaceId: template.workspace_id,
    sourceProjectId: template.source_project_id,
    name: template.name,
    description: template.description,
    includeTasks: template.include_tasks,
    taskCount: template.snapshot_json?.tasks?.length ?? 0,
    createdBy: template.created_by,
    createdAt: template.created_at
  }));
}

export async function getProjectTemplateById(
  supabase: AppSupabaseClient,
  templateId: string
): Promise<TemplateRow | null> {
  const { data, error } = await supabase
    .from('project_templates')
    .select('id, workspace_id, source_project_id, name, description, include_tasks, snapshot_json, created_by, created_at')
    .eq('id', templateId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return (data as unknown as TemplateRow | null) ?? null;
}
