import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PATCH, POST } from '@/app/api/tasks/route';
import { getProjectAssignmentScope } from '@/lib/domain/tasks/assignees';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createSupabaseMock } from '@/tests/helpers/supabase-mock';

vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient: vi.fn() }));
vi.mock('@/lib/domain/tasks/assignees', () => ({
  getProjectAssignmentScope: vi.fn(),
  isAssigneeAllowed: (scope: { assignableUserIds: string[] } | null, assigneeId: string | null | undefined) =>
    !assigneeId || Boolean(scope?.assignableUserIds.includes(assigneeId))
}));

const ids = {
  user: '11111111-1111-4111-8111-111111111111',
  project: '22222222-2222-4222-8222-222222222222',
  status: '33333333-3333-4333-8333-333333333333',
  task: '44444444-4444-4444-8444-444444444444'
};

describe('/api/tasks route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProjectAssignmentScope).mockResolvedValue({
      projectId: ids.project,
      workspaceId: 'w1',
      privacy: 'workspace_visible',
      assignableUserIds: [ids.user]
    });
  });

  it('rejects invalid create payload', async () => {
    const request = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({ title: '' })
    });

    const response = await POST(request as never);

    expect(response.status).toBe(400);
  });

  it('creates task for authenticated user', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: {
          data: [{ sort_order: 2 }],
          error: null
        }
      },
      {
        table: 'tasks',
        response: { data: { id: ids.task }, error: null }
      }
    ]);

    (supabase.auth as any).getUser = vi.fn(async () => ({ data: { user: { id: ids.user } } }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    const request = new Request('http://localhost/api/tasks', {
      method: 'POST',
      body: JSON.stringify({
        projectId: ids.project,
        statusId: ids.status,
        title: 'Create docs'
      })
    });

    const response = await POST(request as never);

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ taskId: ids.task });
  });

  it('rejects invalid assignees on update', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: { data: { project_id: ids.project }, error: null }
      }
    ]);

    (supabase.auth as any).getUser = vi.fn(async () => ({ data: { user: { id: ids.user } } }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);
    vi.mocked(getProjectAssignmentScope).mockResolvedValue({
      projectId: ids.project,
      workspaceId: 'w1',
      privacy: 'private',
      assignableUserIds: []
    });

    const request = new Request('http://localhost/api/tasks', {
      method: 'PATCH',
      body: JSON.stringify({
        id: ids.task,
        assigneeId: '99999999-9999-4999-8999-999999999999'
      })
    });

    const response = await PATCH(request as never);

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: 'Assignee is not allowed for this project.'
    });
  });

  it('updates task for authenticated user', async () => {
    const { supabase } = createSupabaseMock([
      {
        table: 'tasks',
        response: { data: { project_id: ids.project }, error: null }
      },
      {
        table: 'tasks',
        response: { data: null, error: null }
      }
    ]);

    (supabase.auth as any).getUser = vi.fn(async () => ({ data: { user: { id: ids.user } } }));
    vi.mocked(createServerSupabaseClient).mockResolvedValue(supabase as never);

    const request = new Request('http://localhost/api/tasks', {
      method: 'PATCH',
      body: JSON.stringify({ id: ids.task, title: 'Renamed task' })
    });

    const response = await PATCH(request as never);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ taskId: ids.task });
  });
});
