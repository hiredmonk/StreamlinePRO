import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addCommentFromForm,
  createProjectFromForm,
  createTaskFromForm,
  createWorkspaceFromForm,
  markNotificationReadFromForm,
  updateTaskFromForm
} from '@/lib/actions/form-actions';
import { redirect } from 'next/navigation';
import {
  addCommentAction,
  createTaskAction,
  updateTaskAction
} from '@/lib/actions/task-actions';
import {
  createProjectAction,
  createWorkspaceAction
} from '@/lib/actions/project-actions';
import { markNotificationReadAction } from '@/lib/actions/inbox-actions';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/actions/project-actions', () => ({
  createWorkspaceAction: vi.fn(),
  createProjectAction: vi.fn()
}));
vi.mock('@/lib/actions/task-actions', () => ({
  createTaskAction: vi.fn(),
  updateTaskAction: vi.fn(),
  moveTaskAction: vi.fn(),
  completeTaskAction: vi.fn(),
  addCommentAction: vi.fn(),
  uploadTaskAttachmentAction: vi.fn()
}));
vi.mock('@/lib/actions/inbox-actions', () => ({
  markNotificationReadAction: vi.fn()
}));

describe('form actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates workspace then redirects on success', async () => {
    vi.mocked(createWorkspaceAction).mockResolvedValue({
      ok: true,
      data: { workspaceId: 'w1' }
    });

    const formData = new FormData();
    formData.set('name', 'Ops');

    await createWorkspaceFromForm(formData);

    expect(createWorkspaceAction).toHaveBeenCalledWith({ name: 'Ops', icon: undefined });
    expect(redirect).toHaveBeenCalledWith('/projects');
  });

  it('throws when workspace creation fails', async () => {
    vi.mocked(createWorkspaceAction).mockResolvedValue({
      ok: false,
      error: 'workspace create failed'
    });

    const formData = new FormData();
    formData.set('name', 'Ops');

    await expect(createWorkspaceFromForm(formData)).rejects.toThrow('workspace create failed');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('throws specific workspace RLS error returned by action', async () => {
    vi.mocked(createWorkspaceAction).mockResolvedValue({
      ok: false,
      error: 'new row violates row-level security policy for table "workspace_members"'
    });

    const formData = new FormData();
    formData.set('name', 'Ops');

    await expect(createWorkspaceFromForm(formData)).rejects.toThrow(
      'new row violates row-level security policy for table "workspace_members"'
    );
    expect(redirect).not.toHaveBeenCalled();
  });

  it('creates project with privacy mapping and redirects', async () => {
    vi.mocked(createProjectAction).mockResolvedValue({
      ok: true,
      data: { projectId: 'p1' }
    });

    const formData = new FormData();
    formData.set('workspaceId', 'w1');
    formData.set('name', 'Roadmap');
    formData.set('privacy', 'private');

    await createProjectFromForm(formData);

    expect(createProjectAction).toHaveBeenCalledWith(
      expect.objectContaining({ privacy: 'private' })
    );
    expect(redirect).toHaveBeenCalledWith('/projects/p1');
  });

  it('throws when project creation fails', async () => {
    vi.mocked(createProjectAction).mockResolvedValue({
      ok: false,
      error: 'project create failed'
    });

    const formData = new FormData();
    formData.set('workspaceId', 'w1');
    formData.set('name', 'Roadmap');

    await expect(createProjectFromForm(formData)).rejects.toThrow('project create failed');
    expect(redirect).not.toHaveBeenCalled();
  });

  it('parses datetime and priority for task creation', async () => {
    vi.mocked(createTaskAction).mockResolvedValue({
      ok: true,
      data: { taskId: 't1' }
    });

    const formData = new FormData();
    formData.set('projectId', '11111111-1111-4111-8111-111111111111');
    formData.set('title', 'Ship release');
    formData.set('dueAtLocal', '2026-02-15T10:30');
    formData.set('priority', 'high');
    formData.set('isToday', 'on');

    await createTaskFromForm(formData);

    const payload = vi.mocked(createTaskAction).mock.calls[0]?.[0];
    expect(payload?.dueAt).toContain('2026-02-15T');
    expect(payload?.priority).toBe('high');
    expect(payload?.isToday).toBe(true);
  });

  it('throws when task update action fails', async () => {
    vi.mocked(updateTaskAction).mockResolvedValue({ ok: false, error: 'update failed' });

    const formData = new FormData();
    formData.set('id', '11111111-1111-4111-8111-111111111111');
    formData.set('title', 'Edited');

    await expect(updateTaskFromForm(formData)).rejects.toThrow('update failed');
  });

  it('forwards comment and notification read forms', async () => {
    vi.mocked(addCommentAction).mockResolvedValue({ ok: true, data: { commentId: 'c1' } });
    vi.mocked(markNotificationReadAction).mockResolvedValue({
      ok: true,
      data: { id: 'n1' }
    });

    const commentForm = new FormData();
    commentForm.set('taskId', '11111111-1111-4111-8111-111111111111');
    commentForm.set('body', 'Looks good');

    await addCommentFromForm(commentForm);
    expect(addCommentAction).toHaveBeenCalled();

    const readForm = new FormData();
    readForm.set('id', '11111111-1111-4111-8111-111111111111');

    await markNotificationReadFromForm(readForm);
    expect(markNotificationReadAction).toHaveBeenCalled();
  });
});
