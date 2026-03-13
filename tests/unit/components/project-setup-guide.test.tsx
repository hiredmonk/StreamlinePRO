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
          description: 'Review the workflow lanes first, then add and assign the first task without leaving the page.',
          actions: [
            { label: 'Review status lanes', href: '#workflow-status-manager' },
            { label: 'Add first task', href: '#quick-add-form' }
          ],
          tips: [
            'Use Waiting for blocked or external-dependency work so stuck tasks do not stay mixed into active execution.',
            'Done lanes are the completion targets, and you can assign the first task directly from the row, board card, or drawer.'
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
    expect(screen.getByText(/assign the first task directly from the row, board card, or drawer/i)).toBeInTheDocument();
  });
});
