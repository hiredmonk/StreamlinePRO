import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProjectAction, createWorkspaceAction } from '@/lib/actions/project-actions';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';
import { requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

describe('project actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates workspace and owner membership', async () => {
    const { supabase, history } = createSupabaseMock([
      { table: 'workspaces', response: { data: { id: 'w1' } } },
      { table: 'workspace_members', response: { data: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: '11111111-1111-4111-8111-111111111111' } as never,
      supabase: supabase as never
    });

    const result = await createWorkspaceAction({ name: 'Ops' });

    expect(result).toEqual({ ok: true, data: { workspaceId: 'w1' } });
    expect(history[1]?.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' })
    );
    expect(revalidatePath).toHaveBeenCalledWith('/projects');
  });

  it('creates project with default statuses and sections', async () => {
    const { supabase, history } = createSupabaseMock([
      { table: 'projects', response: { data: { id: 'p1' } } },
      { table: 'project_members', response: { data: null } },
      { table: 'project_statuses', response: { data: null } },
      { table: 'project_sections', response: { data: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: '11111111-1111-4111-8111-111111111111' } as never,
      supabase: supabase as never
    });

    const result = await createProjectAction({
      workspaceId: '22222222-2222-4222-8222-222222222222',
      name: 'Roadmap',
      privacy: 'private'
    });

    expect(result).toEqual({ ok: true, data: { projectId: 'p1' } });
    expect(history[2]?.chain.insert.mock.calls[0]?.[0]).toHaveLength(4);
    expect(history[3]?.chain.insert.mock.calls[0]?.[0]).toHaveLength(3);
    expect(revalidatePath).toHaveBeenCalledWith('/projects/p1');
  });

  it('returns error object when workspace insert fails', async () => {
    const { supabase } = createSupabaseMock([
      { table: 'workspaces', response: { data: null, error: new Error('insert failed') } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: '11111111-1111-4111-8111-111111111111' } as never,
      supabase: supabase as never
    });

    const result = await createWorkspaceAction({ name: 'Ops' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('insert failed');
    }
  });
});
