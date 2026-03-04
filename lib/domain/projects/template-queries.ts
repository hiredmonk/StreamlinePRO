import type { AppSupabaseClient } from '@/lib/supabase/client-types';
import type { ProjectTemplateSummary } from '@/lib/contracts/project-templates';

type TemplateSummaryRow = {
  id: string;
  workspace_id: string;
  name: string;
  include_tasks: boolean;
  created_by: string;
  created_at: string;
};

export async function getProjectTemplateSummaries(
  supabase: AppSupabaseClient,
  workspaceId: string
): Promise<ProjectTemplateSummary[]> {
  const { data: templates, error } = await supabase
    .from('project_templates')
    .select('id, workspace_id, name, include_tasks, created_by, created_at')
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  if (!templates?.length) {
    return [];
  }

  const templateIds = templates.map((template) => template.id);

  const [{ data: statuses, error: statusesError }, { data: sections, error: sectionsError }, { data: tasks, error: tasksError }] =
    await Promise.all([
      supabase
        .from('project_template_statuses')
        .select('template_id')
        .in('template_id', templateIds),
      supabase
        .from('project_template_sections')
        .select('template_id')
        .in('template_id', templateIds),
      supabase
        .from('project_template_tasks')
        .select('template_id')
        .in('template_id', templateIds)
    ]);

  if (statusesError) {
    throw statusesError;
  }
  if (sectionsError) {
    throw sectionsError;
  }
  if (tasksError) {
    throw tasksError;
  }

  const statusCountByTemplateId = countRowsByTemplateId(statuses);
  const sectionCountByTemplateId = countRowsByTemplateId(sections);
  const taskCountByTemplateId = countRowsByTemplateId(tasks);

  return (templates as TemplateSummaryRow[]).map((template) => ({
    id: template.id,
    workspaceId: template.workspace_id,
    name: template.name,
    includeTasks: template.include_tasks,
    statusCount: statusCountByTemplateId.get(template.id) ?? 0,
    sectionCount: sectionCountByTemplateId.get(template.id) ?? 0,
    taskCount: taskCountByTemplateId.get(template.id) ?? 0,
    createdBy: template.created_by,
    createdAt: template.created_at
  }));
}

function countRowsByTemplateId(
  rows: Array<{ template_id: string }> | null
): Map<string, number> {
  const countByTemplateId = new Map<string, number>();

  for (const row of rows ?? []) {
    countByTemplateId.set(
      row.template_id,
      (countByTemplateId.get(row.template_id) ?? 0) + 1
    );
  }

  return countByTemplateId;
}
