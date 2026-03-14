import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SignInPage from '@/app/(auth)/signin/page';
import { getWorkspaceInviteContext } from '@/lib/domain/workspaces/invites';

vi.mock('@/lib/domain/workspaces/invites', () => ({
  getWorkspaceInviteContext: vi.fn()
}));

describe('SignInPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders heading and oauth CTA', async () => {
    vi.mocked(getWorkspaceInviteContext).mockResolvedValue(null);

    render(await SignInPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole('heading', { name: /Work Clarity/i })).toBeInTheDocument();
    expect(screen.getByText(/default home is My Tasks/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      '/auth/google'
    );
  });

  it('renders invite context and invite-aware google href', async () => {
    const inviteId = '11111111-1111-4111-8111-111111111111';
    vi.mocked(getWorkspaceInviteContext).mockResolvedValue({
      id: inviteId,
      workspaceId: 'w1',
      workspaceName: 'Ops',
      email: 'alex@example.com',
      role: 'member'
    });

    render(await SignInPage({ searchParams: Promise.resolve({ workspaceInvite: inviteId }) }));

    expect(screen.getByText('Invitation ready')).toBeInTheDocument();
    expect(screen.getByText(/Accepted invites take you straight into the invited workspace/i)).toBeInTheDocument();
    expect(screen.getByText(/Use Google with alex@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      `/auth/google?workspaceInvite=${inviteId}&next=%2Fprojects%3Fworkspace%3Dw1`
    );
  });

  it('renders without error when workspaceInvite is not a valid UUID', async () => {
    vi.mocked(getWorkspaceInviteContext).mockResolvedValue(null);

    render(await SignInPage({ searchParams: Promise.resolve({ workspaceInvite: 'not-a-uuid' }) }));

    expect(getWorkspaceInviteContext).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /Work Clarity/i })).toBeInTheDocument();
    expect(screen.queryByText('Invitation ready')).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      '/auth/google'
    );
  });
});
