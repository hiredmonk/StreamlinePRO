import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createProjectFromTemplateAction,
  createProjectTemplateAction,
  listProjectTemplatesQuery,
  updateProjectTemplateAction
} from '@/lib/actions/project-template-actions';
import { requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('project template actions', () => {
  const actorId = '11111111-1111-4111-8111-111111111111';
  const otherUserId = '22222222-2222-4222-8222-222222222222';
  const workspaceId = '33333333-3333-4333-8333-333333333333';
  const sourceProjectId = '44444444-4444-4444-8444-444444444444';
  const templateId = '55555555-5555-4555-8555-555555555555';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates project template with status/section/task snapshots', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'projects',
        response: {
          data: {
            id: sourceProjectId,
            workspace_id: workspaceId,
            created_by: otherUserId
          }
        }
      },
      {
        table: 'project_members',
        response: { data: null }
      },
      {
        table: 'workspace_members',
        response: { data: { role: 'admin' } }
      },
      {
        table: 'project_templates',
        response: { data: [] }
      },
      {
        table: 'project_statuses',
        response: {
          data: [
            {
              id: 's1',
              name: 'To do',
              color: '#111111',
              is_done: false,
              sort_order: 0
            },
            {
              id: 's2',
              name: 'Done',
              color: '#1b7f4b',
              is_done: true,
              sort_order: 1
            }
          ]
        }
      },
      {
        table: 'project_sections',
        response: {
          data: [{ id: 'sec1', name: 'Backlog', sort_order: 0 }]
        }
      },
      {
        table: 'project_templates',
        response: { data: null }
      },
      {
        table: 'project_template_statuses',
        response: { data: null }
      },
      {
        table: 'project_template_sections',
        response: { data: null }
      },
      {
        table: 'tasks',
        response: {
          data: [
            {
              title: 'Spec API',
              description: null,
              due_at: '2026-03-05T08:00:00.000Z',
              status_id: 's1',
              section_id: 'sec1',
              sort_order: 1
            },
            {
              title: 'Ship',
              description: 'deploy',
              due_at: '2026-03-07T09:00:00.000Z',
              status_id: 's2',
              section_id: null,
              sort_order: 2
            }
          ]
        }
      },
      {
        table: 'project_template_tasks',
        response: { data: null }
      },
      {
        table: 'project_templates',
        response: {
          data: {
            id: templateId,
            workspace_id: workspaceId,
            name: 'Sprint',
            include_tasks: true,
            created_by: actorId,
            created_at: '2026-03-04T00:00:00.000Z'
          }
        }
      },
      {
        table: 'project_template_statuses',
        response: { data: [{ id: 'a' }, { id: 'b' }] }
      },
      {
        table: 'project_template_sections',
        response: { data: [{ id: 'a' }] }
      },
      {
        table: 'project_template_tasks',
        response: { data: [{ id: 'a' }, { id: 'b' }] }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: actorId } as never,
      supabase: supabase as never
    });

    const result = await createProjectTemplateAction({
      workspaceId,
      sourceProjectId,
      name: 'Sprint',
      includeTasks: true,
      actorUserId: actorId
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected createProjectTemplateAction to succeed.');
    }

    const insertedTemplateTasks = history[10]?.chain.insert.mock.calls[0]?.[0] as Array<{
      due_offset_days: number | null;
      status_name: string | null;
      section_name: string | null;
    }>;
    expect(insertedTemplateTasks).toHaveLength(2);
    expect(insertedTemplateTasks[0]?.due_offset_days).toBe(0);
    expect(insertedTemplateTasks[1]?.due_offset_days).toBe(2);
    expect(insertedTemplateTasks[0]?.status_name).toBe('To do');
    expect(insertedTemplateTasks[0]?.section_name).toBe('Backlog');
    expect(revalidatePath).toHaveBeenCalledWith('/projects');
  });

  it('rejects duplicate template names in same workspace', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'projects',
        response: {
          data: {
            id: sourceProjectId,
            workspace_id: workspaceId,
            created_by: otherUserId
          }
        }
      },
      {
        table: 'project_members',
        response: { data: null }
      },
      {
        table: 'workspace_members',
        response: { data: { role: 'admin' } }
      },
      {
        table: 'project_templates',
        response: { data: [{ id: 'tpl-existing' }] }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: actorId } as never,
      supabase: supabase as never
    });

    const result = await createProjectTemplateAction({
      workspaceId,
      sourceProjectId,
      name: 'Sprint',
      includeTasks: false,
      actorUserId: actorId
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Template name already exists in this workspace.');
    }
  });

  it('clones project from template with due offsets and status fallback', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: { data: { role: 'member' } }
      },
      {
        table: 'project_templates',
        response: {
          data: {
            id: templateId,
            workspace_id: workspaceId,
            name: 'Sprint',
            include_tasks: true,
            created_by: actorId,
            created_at: '2026-03-01T00:00:00.000Z'
          }
        }
      },
      {
        table: 'project_template_statuses',
        response: {
          data: [
            { name: 'To do', color: '#111111', is_done: false, sort_order: 0 },
            { name: 'Done', color: '#1b7f4b', is_done: true, sort_order: 1 }
          ]
        }
      },
      {
        table: 'project_template_sections',
        response: {
          data: [{ name: 'Backlog', sort_order: 0 }]
        }
      },
      {
        table: 'project_template_tasks',
        response: {
          data: [
            {
              title: 'Plan',
              description: null,
              status_name: 'Missing',
              section_name: 'Backlog',
              due_offset_days: 2,
              sort_order: 1
            }
          ]
        }
      },
      {
        table: 'projects',
        response: { data: null }
      },
      {
        table: 'project_members',
        response: { data: null }
      },
      {
        table: 'project_statuses',
        response: { data: null }
      },
      {
        table: 'project_sections',
        response: { data: null }
      },
      {
        table: 'tasks',
        response: { data: null }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: actorId } as never,
      supabase: supabase as never
    });

    const result = await createProjectFromTemplateAction({
      workspaceId,
      templateId,
      projectName: 'Release Sprint',
      dueAnchorDate: '2026-03-10',
      actorUserId: actorId
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected createProjectFromTemplateAction to succeed.');
    }

    const insertedStatuses = history[7]?.chain.insert.mock.calls[0]?.[0] as Array<{
      id: string;
      name: string;
    }>;
    const insertedTasks = history[9]?.chain.insert.mock.calls[0]?.[0] as Array<{
      status_id: string;
      due_at: string | null;
    }>;

    expect(insertedTasks[0]?.status_id).toBe(insertedStatuses[0]?.id);
    expect(insertedTasks[0]?.due_at).toContain('2026-03-12T00:00:00.000Z');
    expect(result.data.createdTaskCount).toBe(1);
    expect(revalidatePath).toHaveBeenCalledWith('/projects');
  });

  it('only allows owner or workspace admin to update templates', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'project_templates',
        response: {
          data: {
            id: 'tpl1',
            workspace_id: workspaceId,
            name: 'Sprint',
            include_tasks: true,
            created_by: otherUserId,
            created_at: '2026-03-01T00:00:00.000Z'
          }
        }
      },
      {
        table: 'workspace_members',
        response: { data: { role: 'member' } }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: actorId } as never,
      supabase: supabase as never
    });

    const result = await updateProjectTemplateAction({
      templateId,
      name: 'Renamed',
      actorUserId: actorId
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        'Only template owners or workspace admins can update templates.'
      );
    }
  });

  it('lists templates with status/section/task counts', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: { data: { role: 'member' } }
      },
      {
        table: 'project_templates',
        response: {
          data: [
            {
              id: 'tpl1',
              workspace_id: workspaceId,
              name: 'Sprint',
              include_tasks: true,
              created_by: actorId,
              created_at: '2026-03-01T00:00:00.000Z'
            }
          ]
        }
      },
      {
        table: 'project_template_statuses',
        response: { data: [{ template_id: 'tpl1' }, { template_id: 'tpl1' }] }
      },
      {
        table: 'project_template_sections',
        response: { data: [{ template_id: 'tpl1' }] }
      },
      {
        table: 'project_template_tasks',
        response: { data: [{ template_id: 'tpl1' }, { template_id: 'tpl1' }] }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: actorId } as never,
      supabase: supabase as never
    });

    const result = await listProjectTemplatesQuery({
      workspaceId,
      actorUserId: actorId
    });

    expect(result.templates).toHaveLength(1);
    expect(result.templates[0]).toMatchObject({
      statusCount: 2,
      sectionCount: 1,
      taskCount: 2
    });
  });
});
