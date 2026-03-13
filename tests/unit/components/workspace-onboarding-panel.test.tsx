import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceOnboardingPanel } from '@/app/components/projects/workspace-onboarding-panel';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  )
}));

describe('WorkspaceOnboardingPanel', () => {
  it('renders steps, optional tag, and CTA links', () => {
    render(
      <WorkspaceOnboardingPanel
        onboarding={{
          title: 'Start your first workflow',
          description: 'Create the first project now, then add a task to confirm the workflow end to end.',
          steps: [
            {
              id: 'workspace',
              title: 'Workspace created',
              description: 'Your team space is ready.',
              status: 'complete'
            },
            {
              id: 'invite',
              title: 'Invite teammates',
              description: 'Optional for solo setup. A pending invite counts as progress.',
              status: 'pending',
              optional: true
            }
          ],
          primaryAction: {
            label: 'Create first project',
            href: '#create-project-form'
          },
          secondaryAction: {
            label: 'Invite teammates',
            href: '#team-access-panel'
          }
        }}
      />
    );

    expect(screen.getByText('Workspace onboarding')).toBeInTheDocument();
    expect(screen.getByText('Optional')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create first project' })).toHaveAttribute(
      'href',
      '#create-project-form'
    );
    expect(screen.getByRole('link', { name: 'Invite teammates' })).toHaveAttribute(
      'href',
      '#team-access-panel'
    );
  });
});
