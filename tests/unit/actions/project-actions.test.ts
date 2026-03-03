import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createProjectAction,
  createProjectStatusAction,
  createWorkspaceAction,
  deleteProjectStatusAction,
  reorderProjectStatusesAction,
  updateProjectStatusAction
} from '@/lib/actions/project-actions';
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

  it('cleans up created project when default initialization fails', async () => {
    const { supabase, history } = createSupabaseMock([
      { table: 'projects', response: { data: null } },
      { table: 'projects', response: { data: null } },
      { table: 'project_members', response: { data: null } },
      {
        table: 'project_statuses',
        response: { data: null, error: new Error('status init failed') }
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
      expect(result.error).toBe('status init failed');
    }
    expect(history[3]?.chain.delete).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
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

  it('creates a project status with unique name and next sort order', async () => {
    const doneStatusId = '99999999-9999-4999-8999-999999999999';
    const projectId = '11111111-1111-4111-8111-111111111111';
    const { supabase, history } = createSupabaseMock([
      {
        table: 'project_statuses',
        response: {
          data: [
            {
              id: doneStatusId,
              project_id: projectId,
              name: 'Done',
              color: '#111111',
              is_done: true,
              sort_order: 0
            }
          ]
        }
      },
      { table: 'project_statuses', response: { data: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: supabase as never
    });

    const result = await createProjectStatusAction({
      projectId,
      name: 'Blocked',
      color: '#222222'
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      throw new Error('Expected status creation to succeed.');
    }

    expect(history[1]?.chain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        project_id: projectId,
        name: 'Blocked',
        color: '#222222',
        sort_order: 1
      })
    );
  });

  it('rejects duplicate project status names', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'project_statuses',
        response: {
          data: [
            {
              id: 's1',
              project_id: 'p1',
              name: 'Blocked',
              color: '#111111',
              is_done: false,
              sort_order: 0
            }
          ]
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: supabase as never
    });

    const result = await createProjectStatusAction({
      projectId: '11111111-1111-4111-8111-111111111111',
      name: ' blocked '
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('Status name already exists in this project.');
    }
  });

  it('requires at least one done status when adding a lane', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'project_statuses',
        response: { data: [] }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: supabase as never
    });

    const result = await createProjectStatusAction({
      projectId: '11111111-1111-4111-8111-111111111111',
      name: 'Backlog',
      isDone: false
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('At least one done status is required.');
    }
  });

  it('prevents removing the last done status', async () => {
    const doneStatusId = '11111111-1111-4111-8111-111111111111';
    const openStatusId = '22222222-2222-4222-8222-222222222222';
    const { supabase } = createSupabaseMock([
      {
        table: 'project_statuses',
        response: {
          data: {
            id: doneStatusId,
            project_id: 'p1',
            name: 'Done',
            is_done: true
          }
        }
      },
      {
        table: 'project_statuses',
        response: {
          data: [
            {
              id: doneStatusId,
              project_id: 'p1',
              name: 'Done',
              color: '#1b7f4b',
              is_done: true,
              sort_order: 1
            },
            {
              id: openStatusId,
              project_id: 'p1',
              name: 'Doing',
              color: '#1565c0',
              is_done: false,
              sort_order: 0
            }
          ]
        }
      }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: supabase as never
    });

    const result = await updateProjectStatusAction({
      id: doneStatusId,
      isDone: false
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe('At least one done status is required.');
    }
  });

  it('reorders statuses with exact ids', async () => {
    const statusA = '11111111-1111-4111-8111-111111111111';
    const statusB = '22222222-2222-4222-8222-222222222222';
    const { supabase, history } = createSupabaseMock([
      {
        table: 'project_statuses',
        response: {
          data: [
            {
              id: statusA,
              project_id: '11111111-1111-4111-8111-111111111111',
              name: 'To do',
              color: '#111111',
              is_done: false,
              sort_order: 0
            },
            {
              id: statusB,
              project_id: '11111111-1111-4111-8111-111111111111',
              name: 'Doing',
              color: '#222222',
              is_done: false,
              sort_order: 1
            }
          ]
        }
      },
      { table: 'project_statuses', response: { data: null } },
      { table: 'project_statuses', response: { data: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: supabase as never
    });

    const result = await reorderProjectStatusesAction({
      projectId: '11111111-1111-4111-8111-111111111111',
      orderedStatusIds: [statusB, statusA]
    });

    expect(result.ok).toBe(true);
    expect(history[1]?.chain.update).toHaveBeenCalledWith({ sort_order: 0 });
    expect(history[2]?.chain.update).toHaveBeenCalledWith({ sort_order: 1 });
  });

  it('deletes a status and reassigns tasks to fallback', async () => {
    const { supabase, history } = createSupabaseMock([
      {
        table: 'project_statuses',
        response: {
          data: {
            id: 's1',
            project_id: 'p1',
            is_done: false
          }
        }
      },
      {
        table: 'project_statuses',
        response: {
          data: {
            id: 's2',
            project_id: 'p1',
            is_done: true
          }
        }
      },
      {
        table: 'project_statuses',
        response: {
          data: [
            {
              id: 's1',
              project_id: 'p1',
              name: 'To do',
              color: '#111111',
              is_done: false,
              sort_order: 0
            },
            {
              id: 's2',
              project_id: 'p1',
              name: 'Done',
              color: '#1b7f4b',
              is_done: true,
              sort_order: 1
            }
          ]
        }
      },
      { table: 'tasks', response: { data: null } },
      { table: 'project_statuses', response: { data: null } },
      {
        table: 'project_statuses',
        response: {
          data: [
            {
              id: 's2',
              project_id: 'p1',
              name: 'Done',
              color: '#1b7f4b',
              is_done: true,
              sort_order: 1
            }
          ]
        }
      },
      { table: 'project_statuses', response: { data: null } }
    ]);

    vi.mocked(requireUser).mockResolvedValue({
      user: { id: 'u1' } as never,
      supabase: supabase as never
    });

    const result = await deleteProjectStatusAction({
      id: '11111111-1111-4111-8111-111111111111',
      fallbackStatusId: '22222222-2222-4222-8222-222222222222'
    });

    expect(result.ok).toBe(true);
    expect(history[3]?.chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ status_id: '22222222-2222-4222-8222-222222222222' })
    );
    expect(history[4]?.chain.delete).toHaveBeenCalled();
  });
});
