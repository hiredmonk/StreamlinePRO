import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectSetupGuidePanel } from '@/app/components/projects/project-setup-guide';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  )
}));

describe('ProjectSetupGuidePanel', () => {
  it('renders guide actions and setup tips', () => {
    render(
      <ProjectSetupGuidePanel
        guide={{
          title: 'Set up this project in two quick steps',
          description: 'Review the default status lanes, then add the first task without leaving the page.',
          actions: [
            { label: 'Review status lanes', href: '#workflow-status-manager' },
            { label: 'Add first task', href: '#quick-add-form' }
          ],
          tips: [
            'Keep the default lanes if they already fit. You can rename or reorder them later.',
            'Create one real task first so the team can validate status flow before adding more.'
          ]
        }}
      />
    );

    expect(screen.getByText('Project setup')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review status lanes' })).toHaveAttribute(
      'href',
      '#workflow-status-manager'
    );
    expect(screen.getByRole('link', { name: 'Add first task' })).toHaveAttribute(
      'href',
      '#quick-add-form'
    );
    expect(screen.getByText('Create one real task first so the team can validate status flow before adding more.')).toBeInTheDocument();
  });
});
