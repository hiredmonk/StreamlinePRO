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
      { table: 'workspaces', response: { data: null } },
      { table: 'workspace_members', response: { data: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: '11111111-1111-4111-8111-111111111111' } as never,
      supabase: supabase as never
    });

    const result = await createWorkspaceAction({ name: 'Ops' });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected workspace creation to succeed.');
    }

    expect(result.data.workspaceId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    expect(history[0]?.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ id: result.data.workspaceId, name: 'Ops' })
    );
    expect(history[1]?.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ workspace_id: result.data.workspaceId, role: 'admin' })
    );
    expect(history[0]?.chain.select).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith('/projects');
  });

  it('creates project with default statuses and sections', async () => {
    const { supabase, history } = createSupabaseMock([
      { table: 'projects', response: { data: null } },
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

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected project creation to succeed.');
    }

    expect(result.data.projectId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
    expect(history[0]?.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: result.data.projectId,
        workspace_id: '22222222-2222-4222-8222-222222222222',
        name: 'Roadmap'
      })
    );
    expect(history[0]?.chain.select).not.toHaveBeenCalled();
    expect(history[1]?.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: result.data.projectId,
        role: 'editor'
      })
    );

    const statusRows = history[2]?.chain.insert.mock.calls[0]?.[0] as Array<{ project_id: string }>;
    expect(statusRows).toHaveLength(4);
    expect(statusRows.every((row) => row.project_id === result.data.projectId)).toBe(true);

    const sectionRows = history[3]?.chain.insert.mock.calls[0]?.[0] as Array<{ project_id: string }>;
    expect(sectionRows).toHaveLength(3);
    expect(sectionRows.every((row) => row.project_id === result.data.projectId)).toBe(true);

    expect(revalidatePath).toHaveBeenCalledWith('/projects');
    expect(revalidatePath).toHaveBeenCalledWith(`/projects/${result.data.projectId}`);
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

  it('returns RLS error message when owner membership insert fails', async () => {
    const { supabase } = createSupabaseMock([
      { table: 'workspaces', response: { data: null } },
      {
        table: 'workspace_members',
        response: {
          data: null,
          error: {
            code: '42501',
            message: 'new row violates row-level security policy for table "workspace_members"'
          }
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: '11111111-1111-4111-8111-111111111111' } as never,
      supabase: supabase as never
    });

    const result = await createWorkspaceAction({ name: 'Ops' });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        'new row violates row-level security policy for table "workspace_members"'
      );
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it('returns project member RLS error message when project membership insert fails', async () => {
    const { supabase } = createSupabaseMock([
      { table: 'projects', response: { data: null } },
      {
        table: 'project_members',
        response: {
          data: null,
          error: {
            code: '42501',
            message: 'new row violates row-level security policy for table "project_members"'
          }
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: '11111111-1111-4111-8111-111111111111' } as never,
      supabase: supabase as never
    });

    const result = await createProjectAction({
      workspaceId: '22222222-2222-4222-8222-222222222222',
      name: 'Roadmap',
      privacy: 'workspace_visible'
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe(
        'new row violates row-level security policy for table "project_members"'
      );
    }
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
