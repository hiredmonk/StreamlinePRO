import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreateFromTemplateForm } from '@/app/components/projects/create-from-template-form';

vi.mock('@/lib/actions/form-actions', () => ({
  createProjectFromTemplateFromForm: vi.fn()
}));

describe('CreateFromTemplateForm', () => {
  it('does not render when no templates exist', () => {
    const { container } = render(
      <CreateFromTemplateForm
        workspaceId="w1"
        actorUserId="u1"
        templates={[]}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('renders template selection and clone fields', () => {
    render(
      <CreateFromTemplateForm
        workspaceId="w1"
        actorUserId="u1"
        templates={[
          {
            id: 't1',
            workspaceId: 'w1',
            name: 'Sprint',
            includeTasks: true,
            statusCount: 2,
            sectionCount: 1,
            taskCount: 3,
            createdBy: 'u1',
            createdAt: '2026-03-04T00:00:00.000Z'
          }
        ]}
      />
    );

    expect(screen.getByDisplayValue('w1')).toHaveAttribute('name', 'workspaceId');
    expect(screen.getByDisplayValue('u1')).toHaveAttribute('name', 'actorUserId');
    expect(screen.getByRole('option', { name: /Sprint/ })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('New project name from template')).toBeRequired();
    expect(screen.getByRole('button', { name: 'Create from template' })).toBeInTheDocument();
  });
});
