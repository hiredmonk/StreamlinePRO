import { describe, expect, it } from 'vitest';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';
import { getProjectTemplateSummaries } from '@/lib/domain/projects/template-queries';

describe('project template queries', () => {
  it('returns empty array when workspace has no templates', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'project_templates',
        response: { data: [] }
      }
    ]);

    const templates = await getProjectTemplateSummaries(supabase as never, 'w1');
    expect(templates).toEqual([]);
  });

  it('maps template summaries with status/section/task counts', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'project_templates',
        response: {
          data: [
            {
              id: 't1',
              workspace_id: 'w1',
              name: 'Sprint',
              include_tasks: true,
              created_by: 'u1',
              created_at: '2026-03-04T00:00:00.000Z'
            }
          ]
        }
      },
      {
        table: 'project_template_statuses',
        response: { data: [{ template_id: 't1' }, { template_id: 't1' }] }
      },
      {
        table: 'project_template_sections',
        response: { data: [{ template_id: 't1' }] }
      },
      {
        table: 'project_template_tasks',
        response: { data: [{ template_id: 't1' }, { template_id: 't1' }] }
      }
    ]);

    const templates = await getProjectTemplateSummaries(supabase as never, 'w1');
    expect(templates).toEqual([
      expect.objectContaining({
        id: 't1',
        statusCount: 2,
        sectionCount: 1,
        taskCount: 2
      })
    ]);
  });
});
