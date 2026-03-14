import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CreateProjectForm } from '@/app/components/projects/create-project-form';

vi.mock('@/lib/actions/form-actions', () => ({
  createProjectFromForm: vi.fn()
}));

const templates = [
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
  },
  {
    id: 't2',
    workspaceId: 'w1',
    sourceProjectId: 'p2',
    name: 'Onboarding',
    description: null,
    includeTasks: false,
    taskCount: 0,
    createdBy: 'u1',
    createdAt: '2026-03-04T00:00:00.000Z'
  }
];

function getTemplateSelect() {
  const selects = screen.getAllByRole('combobox');
  return selects.find((el) => el.getAttribute('name') === 'templateId') as HTMLSelectElement;
}

describe('CreateProjectForm', () => {
  it('renders project fields and passes workspace id', () => {
    render(<CreateProjectForm workspaceId="w1" />);

    const hiddenWorkspace = screen.getByDisplayValue('w1');
    expect(hiddenWorkspace).toHaveAttribute('name', 'workspaceId');

    expect(screen.getByPlaceholderText('New project name')).toBeRequired();
    expect(screen.getByRole('option', { name: 'Private' })).toBeInTheDocument();
  });

  it('renders template selector when templates are provided', () => {
    render(<CreateProjectForm workspaceId="w1" templates={templates} />);

    expect(screen.getByRole('option', { name: 'Blank project' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Sprint (3 tasks)' })).toBeInTheDocument();
  });

  it('does not render template selector when no templates', () => {
    render(<CreateProjectForm workspaceId="w1" templates={[]} />);

    expect(screen.queryByRole('option', { name: 'Blank project' })).not.toBeInTheDocument();
  });

  it('prefills description when a template with description is selected', () => {
    render(<CreateProjectForm workspaceId="w1" templates={templates} />);

    const templateSelect = getTemplateSelect();
    const descriptionInput = screen.getByPlaceholderText('Description (optional)') as HTMLInputElement;

    fireEvent.change(templateSelect, { target: { value: 't1' } });

    expect(descriptionInput.value).toBe('Two-week sprint');
  });

  it('clears description when blank project is selected', () => {
    render(<CreateProjectForm workspaceId="w1" templates={templates} />);

    const templateSelect = getTemplateSelect();
    const descriptionInput = screen.getByPlaceholderText('Description (optional)') as HTMLInputElement;

    // Select template first
    fireEvent.change(templateSelect, { target: { value: 't1' } });
    expect(descriptionInput.value).toBe('Two-week sprint');

    // Select blank project
    fireEvent.change(templateSelect, { target: { value: '' } });
    expect(descriptionInput.value).toBe('');
  });

  it('allows user to edit prefilled description', () => {
    render(<CreateProjectForm workspaceId="w1" templates={templates} />);

    const templateSelect = getTemplateSelect();
    const descriptionInput = screen.getByPlaceholderText('Description (optional)') as HTMLInputElement;

    fireEvent.change(templateSelect, { target: { value: 't1' } });
    expect(descriptionInput.value).toBe('Two-week sprint');

    fireEvent.change(descriptionInput, { target: { value: 'Custom description' } });
    expect(descriptionInput.value).toBe('Custom description');
  });
});
