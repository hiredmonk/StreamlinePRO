import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getProjectById,
  getProjectsForWorkspace,
  getWorkspacesForUser
} from '@/lib/domain/projects/queries';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

describe('project queries', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('maps workspace membership rows into workspace summaries', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'workspace_members',
        response: {
          data: [
            {
              role: 'admin',
              workspace: [
                {
                  id: 'w1',
                  name: 'Ops',
                  icon: '⚙️'
                }
              ]
            }
          ]
        }
      }
    ]);

    const workspaces = await getWorkspacesForUser(supabase as never, 'u1');

    expect(workspaces).toEqual([
      {
        id: 'w1',
        name: 'Ops',
        icon: '⚙️',
        role: 'admin'
      }
    ]);
  });

  it('computes project task and overdue counts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));

    const { supabase } = createSupabaseMock([
      {
        table: 'projects',
        response: {
          data: [
            {
              id: 'p1',
              workspace_id: 'w1',
              name: 'Core',
              description: null,
              privacy: 'workspace_visible'
            }
          ]
        }
      },
      {
        table: 'tasks',
        response: {
          data: [
            { project_id: 'p1', due_at: '2026-02-14T12:00:00.000Z', completed_at: null },
            { project_id: 'p1', due_at: '2026-02-16T12:00:00.000Z', completed_at: null },
            { project_id: 'p1', due_at: '2026-02-10T12:00:00.000Z', completed_at: '2026-02-11T12:00:00.000Z' }
          ]
        }
      }
    ]);

    const projects = await getProjectsForWorkspace(supabase as never, 'w1');

    expect(projects[0]?.taskCount).toBe(3);
    expect(projects[0]?.overdueCount).toBe(1);
  });

  it('returns null for unknown project id', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'projects',
        response: { data: null, error: null }
      }
    ]);

    const project = await getProjectById(supabase as never, 'missing');
    expect(project).toBeNull();
  });

  it('throws when projects query fails', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'projects',
        response: { data: null, error: new Error('db down') }
      }
    ]);

    await expect(getProjectsForWorkspace(supabase as never, 'w1')).rejects.toThrow('db down');
  });
});
