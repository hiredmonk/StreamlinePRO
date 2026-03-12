import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addCommentFromForm,
  cancelWorkspaceInviteFromForm,
  createProjectStatusFromForm,
  createProjectFromForm,
  createTaskFromForm,
  createWorkspaceFromForm,
  createWorkspaceInviteFromForm,
  deleteProjectStatusFromForm,
  markNotificationReadFromForm,
  removeWorkspaceMemberFromForm,
  reorderProjectStatusesFromForm,
  updateProjectStatusFromForm,
  updateTaskFromForm,
  updateWorkspaceMemberRoleFromForm
} from '@/lib/actions/form-actions';
import { redirect } from 'next/navigation';
import { addCommentAction, createTaskAction, updateTaskAction } from '@/lib/actions/task-actions';
import {
  createProjectStatusAction,
  createProjectAction,
  deleteProjectStatusAction,
  reorderProjectStatusesAction,
  updateProjectStatusAction,
  createWorkspaceAction
} from '@/lib/actions/project-actions';
import {
  cancelWorkspaceInviteAction,
  createWorkspaceInviteAction,
  removeWorkspaceMemberAction,
  updateWorkspaceMemberRoleAction
} from '@/lib/actions/workspace-actions';
import { markNotificationReadAction } from '@/lib/actions/inbox-actions';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/actions/project-actions', () => ({
  createWorkspaceAction: vi.fn(),
  createProjectAction: vi.fn(),
  createProjectStatusAction: vi.fn(),
  updateProjectStatusAction: vi.fn(),
  reorderProjectStatusesAction: vi.fn(),
  deleteProjectStatusAction: vi.fn()
}));
vi.mock('@/lib/actions/workspace-actions', () => ({
  createWorkspaceInviteAction: vi.fn(),
  cancelWorkspaceInviteAction: vi.fn(),
  updateWorkspaceMemberRoleAction: vi.fn(),
  removeWorkspaceMemberAction: vi.fn()
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

  it('creates a first workspace then redirects to the active workspace on success', async () => {
    vi.mocked(createWorkspaceAction).mockResolvedValue({
      ok: true,
      data: { workspaceId: 'w1' }
    });

    const formData = new FormData();
    formData.set('name', 'Ops');

    await createWorkspaceFromForm(formData);

    expect(createWorkspaceAction).toHaveBeenCalledWith({ name: 'Ops', icon: undefined });
    expect(redirect).toHaveBeenCalledWith('/projects?workspace=w1');
  });

  it('creates an additional workspace then redirects to the workspace directory when requested', async () => {
    vi.mocked(createWorkspaceAction).mockResolvedValue({
      ok: true,
      data: { workspaceId: 'w2' }
    });

    const formData = new FormData();
    formData.set('name', 'Client Ops');
    formData.set('redirectTo', 'workspace-directory');

    await createWorkspaceFromForm(formData);

    expect(createWorkspaceAction).toHaveBeenCalledWith({ name: 'Client Ops', icon: undefined });
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

  it('forwards workspace invite and member mutation forms', async () => {
    vi.mocked(createWorkspaceInviteAction).mockResolvedValue({
      ok: true,
      data: { inviteId: 'i1' }
    });
    vi.mocked(cancelWorkspaceInviteAction).mockResolvedValue({
      ok: true,
      data: { inviteId: 'i1', workspaceId: 'w1' }
    });
    vi.mocked(updateWorkspaceMemberRoleAction).mockResolvedValue({
      ok: true,
      data: { workspaceId: 'w1', userId: 'u1' }
    });
    vi.mocked(removeWorkspaceMemberAction).mockResolvedValue({
      ok: true,
      data: { workspaceId: 'w1', userId: 'u1' }
    });

    const inviteForm = new FormData();
    inviteForm.set('workspaceId', 'w1');
    inviteForm.set('email', 'alex@example.com');
    inviteForm.set('role', 'admin');
    await createWorkspaceInviteFromForm(inviteForm);

    const cancelForm = new FormData();
    cancelForm.set('inviteId', 'i1');
    await cancelWorkspaceInviteFromForm(cancelForm);

    const roleForm = new FormData();
    roleForm.set('workspaceId', 'w1');
    roleForm.set('userId', 'u1');
    roleForm.set('role', 'member');
    await updateWorkspaceMemberRoleFromForm(roleForm);

    const removeForm = new FormData();
    removeForm.set('workspaceId', 'w1');
    removeForm.set('userId', 'u1');
    await removeWorkspaceMemberFromForm(removeForm);

    expect(createWorkspaceInviteAction).toHaveBeenCalledWith({
      workspaceId: 'w1',
      email: 'alex@example.com',
      role: 'admin'
    });
    expect(cancelWorkspaceInviteAction).toHaveBeenCalledWith({ inviteId: 'i1' });
    expect(updateWorkspaceMemberRoleAction).toHaveBeenCalledWith({
      workspaceId: 'w1',
      userId: 'u1',
      role: 'member'
    });
    expect(removeWorkspaceMemberAction).toHaveBeenCalledWith({
      workspaceId: 'w1',
      userId: 'u1'
    });
  });

  it('parses datetime, priority, and explicit null assignee for task forms', async () => {
    vi.mocked(createTaskAction).mockResolvedValue({
      ok: true,
      data: { taskId: 't1' }
    });
    vi.mocked(updateTaskAction).mockResolvedValue({
      ok: true,
      data: { taskId: 't1' }
    });

    const createForm = new FormData();
    createForm.set('projectId', '11111111-1111-4111-8111-111111111111');
    createForm.set('title', 'Ship release');
    createForm.set('dueAtLocal', '2026-02-15T10:30');
    createForm.set('priority', 'high');
    createForm.set('isToday', 'on');
    createForm.set('assigneeId', '');
    await createTaskFromForm(createForm);

    const createPayload = vi.mocked(createTaskAction).mock.calls[0]?.[0];
    expect(createPayload?.dueAt).toContain('2026-02-15T');
    expect(createPayload?.priority).toBe('high');
    expect(createPayload?.isToday).toBe(true);
    expect(createPayload?.assigneeId).toBeNull();

    const updateForm = new FormData();
    updateForm.set('id', '11111111-1111-4111-8111-111111111111');
    updateForm.set('assigneeId', '');
    await updateTaskFromForm(updateForm);

    expect(vi.mocked(updateTaskAction).mock.calls[0]?.[0]).toMatchObject({
      id: '11111111-1111-4111-8111-111111111111',
      assigneeId: null
    });
  });

  it('forwards project workflow status forms', async () => {
    vi.mocked(createProjectStatusAction).mockResolvedValue({
      ok: true,
      data: { statusId: 's1' }
    });
    vi.mocked(updateProjectStatusAction).mockResolvedValue({
      ok: true,
      data: { statusId: 's1' }
    });
    vi.mocked(reorderProjectStatusesAction).mockResolvedValue({
      ok: true,
      data: { projectId: 'p1' }
    });
    vi.mocked(deleteProjectStatusAction).mockResolvedValue({
      ok: true,
      data: { deletedStatusId: 's1' }
    });

    const createForm = new FormData();
    createForm.set('projectId', 'p1');
    createForm.set('name', 'Blocked');
    createForm.set('color', '#222222');
    createForm.set('isDone', 'on');
    await createProjectStatusFromForm(createForm);

    const updateForm = new FormData();
    updateForm.set('id', 's1');
    updateForm.set('name', 'Waiting');
    updateForm.set('color', '#333333');
    await updateProjectStatusFromForm(updateForm);

    const reorderForm = new FormData();
    reorderForm.set('projectId', 'p1');
    reorderForm.append('orderedStatusIds', 's2');
    reorderForm.append('orderedStatusIds', 's1');
    await reorderProjectStatusesFromForm(reorderForm);

    const deleteForm = new FormData();
    deleteForm.set('id', 's1');
    deleteForm.set('fallbackStatusId', 's2');
    await deleteProjectStatusFromForm(deleteForm);

    expect(createProjectStatusAction).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1', name: 'Blocked', isDone: true })
    );
    expect(updateProjectStatusAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1', name: 'Waiting' })
    );
    expect(reorderProjectStatusesAction).toHaveBeenCalledWith(
      expect.objectContaining({ orderedStatusIds: ['s2', 's1'] })
    );
    expect(deleteProjectStatusAction).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1', fallbackStatusId: 's2' })
    );
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
