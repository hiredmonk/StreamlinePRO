import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SignInPage from '@/app/(auth)/signin/page';
import { getWorkspaceInviteContext } from '@/lib/domain/workspaces/invites';

vi.mock('@/lib/domain/workspaces/invites', () => ({
  getWorkspaceInviteContext: vi.fn()
}));

describe('SignInPage', () => {
  it('renders heading and oauth CTA', async () => {
    vi.mocked(getWorkspaceInviteContext).mockResolvedValue(null);

    render(await SignInPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByRole('heading', { name: /Work Clarity/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      '/auth/google'
    );
  });

  it('renders invite context and invite-aware google href', async () => {
    vi.mocked(getWorkspaceInviteContext).mockResolvedValue({
      id: 'i1',
      workspaceId: 'w1',
      workspaceName: 'Ops',
      email: 'alex@example.com',
      role: 'member'
    });

    render(await SignInPage({ searchParams: Promise.resolve({ workspaceInvite: 'i1' }) }));

    expect(screen.getByText('Invitation ready')).toBeInTheDocument();
    expect(screen.getByText(/Use Google with alex@example.com/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      '/auth/google?workspaceInvite=i1&next=%2Fprojects%3Fworkspace%3Dw1'
    );
  });
});

