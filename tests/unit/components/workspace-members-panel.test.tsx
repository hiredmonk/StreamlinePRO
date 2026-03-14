import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceMembersPanel } from '@/app/components/projects/workspace-members-panel';

vi.mock('@/lib/actions/form-actions', () => ({
  createWorkspaceInviteFromForm: vi.fn(),
  updateWorkspaceMemberRoleFromForm: vi.fn(),
  removeWorkspaceMemberFromForm: vi.fn()
}));

describe('WorkspaceMembersPanel', () => {
  const members = [
    {
      workspaceId: 'w1',
      userId: 'u1',
      email: 'owner@example.com',
      role: 'admin' as const,
      joinedAt: '2026-02-15T00:00:00.000Z'
    },
    {
      workspaceId: 'w1',
      userId: 'u2',
      email: 'member@example.com',
      role: 'member' as const,
      joinedAt: '2026-02-16T00:00:00.000Z'
    }
  ];

  it('renders admin controls when actor is workspace admin', () => {
    render(
      <WorkspaceMembersPanel
        workspace={{ id: 'w1', name: 'Ops', icon: null, role: 'admin' }}
        actorUserId="u1"
        members={members}
      />
    );

    expect(screen.getByText('Workspace members')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Invite by email')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Save role' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Remove' })).toHaveLength(2);
    const workspaceInputs = screen
      .getAllByDisplayValue('w1')
      .filter((element) => element.getAttribute('name') === 'workspaceId');
    expect(workspaceInputs.length).toBeGreaterThan(0);
  });

  it('uses userId field name for hidden inputs instead of memberUserId', () => {
    render(
      <WorkspaceMembersPanel
        workspace={{ id: 'w1', name: 'Ops', icon: null, role: 'admin' }}
        actorUserId="u1"
        members={members}
      />
    );

    const userIdInputs = screen
      .getAllByDisplayValue('u1')
      .filter((element) => element.getAttribute('name') === 'userId');
    expect(userIdInputs.length).toBeGreaterThan(0);

    const memberUserIdInputs = screen
      .getAllByDisplayValue('u1')
      .filter((element) => element.getAttribute('name') === 'memberUserId');
    expect(memberUserIdInputs).toHaveLength(0);

    const actorUserIdInputs = screen
      .queryAllByDisplayValue('u1')
      .filter((element) => element.getAttribute('name') === 'actorUserId');
    expect(actorUserIdInputs).toHaveLength(0);
  });

  it('renders read-only member list for non-admins', () => {
    render(
      <WorkspaceMembersPanel
        workspace={{ id: 'w1', name: 'Ops', icon: null, role: 'member' }}
        actorUserId="u2"
        members={members}
      />
    );

    expect(screen.queryByPlaceholderText('Invite by email')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Save role' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    expect(
      screen.getByText('You can view members in this workspace. Admins manage invites and role changes.')
    ).toBeInTheDocument();
  });
});
