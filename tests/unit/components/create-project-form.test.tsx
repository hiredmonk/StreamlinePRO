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
});
