import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SaveProjectTemplateForm } from '@/app/components/projects/save-project-template-form';

vi.mock('@/lib/actions/form-actions', () => ({
  createProjectTemplateFromForm: vi.fn()
}));

describe('SaveProjectTemplateForm', () => {
  it('renders required fields and hidden projectId', () => {
    render(
      <SaveProjectTemplateForm
        projectId="p1"
      />
    );

    expect(screen.getByPlaceholderText('Template name')).toBeRequired();
    expect(screen.getByDisplayValue('p1')).toHaveAttribute('name', 'projectId');
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'Include open tasks' })).toBeChecked();
    expect(screen.getByRole('button', { name: 'Save as template' })).toBeInTheDocument();
  });
});
