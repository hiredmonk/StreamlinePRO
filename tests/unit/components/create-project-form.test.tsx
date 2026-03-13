import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreateProjectForm } from '@/app/components/projects/create-project-form';

vi.mock('@/lib/actions/form-actions', () => ({
  createProjectFromForm: vi.fn()
}));

describe('CreateProjectForm', () => {
  it('renders project fields and passes workspace id', () => {
    render(<CreateProjectForm workspaceId="w1" />);

    const hiddenWorkspace = screen.getByDisplayValue('w1');
    expect(hiddenWorkspace).toHaveAttribute('name', 'workspaceId');

    expect(screen.getByPlaceholderText('New project name')).toBeRequired();
    expect(screen.getByRole('option', { name: 'Private' })).toBeInTheDocument();
  });

  it('renders template selector when templates are provided', () => {
    render(
      <CreateProjectForm
        workspaceId="w1"
        templates={[
          {
            id: 't1',
            workspaceId: 'w1',
            sourceProjectId: 'p1',
            name: 'Sprint',
            description: 'Two-week sprint',
            includeTasks: true,
            taskCount: 3,
            createdBy: 'u1',
            createdAt: '2026-03-04T00:00:00.000Z'
          }
        ]}
      />
    );

    expect(screen.getByRole('option', { name: 'Blank project' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sprint (3 tasks)' })).toBeInTheDocument();
  });

  it('does not render template selector when no templates', () => {
    render(<CreateProjectForm workspaceId="w1" templates={[]} />);

    expect(screen.queryByRole('option', { name: 'Blank project' })).not.toBeInTheDocument();
  });
});
