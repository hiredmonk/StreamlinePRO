import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CreateWorkspaceForm } from '@/app/components/projects/create-workspace-form';

vi.mock('@/lib/actions/form-actions', () => ({
  createWorkspaceFromForm: vi.fn()
}));

describe('CreateWorkspaceForm', () => {
  it('renders required workspace fields and submit button', () => {
    render(<CreateWorkspaceForm />);

    expect(screen.getByPlaceholderText('Workspace name')).toBeRequired();
    expect(screen.getByPlaceholderText('Emoji icon (optional)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeInTheDocument();
  });
});
