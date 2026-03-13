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

  it('maps template summaries with task count from snapshot_json', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'project_templates',
        response: {
          data: [
            {
              id: 't1',
              workspace_id: 'w1',
              source_project_id: 'p1',
              name: 'Sprint',
              description: 'Two-week sprint',
              include_tasks: true,
              snapshot_json: {
                statuses: [
                  { name: 'To do', color: '#111111', isDone: false, sortOrder: 0 },
                  { name: 'Done', color: '#1b7f4b', isDone: true, sortOrder: 1 }
                ],
                sections: [{ name: 'Backlog', sortOrder: 0 }],
                tasks: [
                  { title: 'Task 1', priority: null, statusName: 'To do', sectionName: 'Backlog' },
                  { title: 'Task 2', priority: 'high', statusName: 'To do', sectionName: null }
                ]
              },
              created_by: 'u1',
              created_at: '2026-03-04T00:00:00.000Z'
            }
          ]
        }
      }
    ]);

    const templates = await getProjectTemplateSummaries(supabase as never, 'w1');
    expect(templates).toEqual([
      expect.objectContaining({
        id: 't1',
        sourceProjectId: 'p1',
        name: 'Sprint',
        description: 'Two-week sprint',
        taskCount: 2
      })
    ]);
  });
});
