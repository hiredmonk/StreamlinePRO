import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QuickAddForm } from '@/app/components/tasks/quick-add-form';

vi.mock('@/lib/actions/form-actions', () => ({
  createTaskFromForm: vi.fn()
}));

describe('QuickAddForm', () => {
  it('prefills selected project and renders task fields', () => {
    render(
      <QuickAddForm
        preselectedProjectId="p2"
        assigneesByProject={{
          p2: [
            {
              userId: 'u1',
              email: 'alex@example.com',
              displayName: 'Alex',
              avatarUrl: null,
              initials: 'AL'
            }
          ]
        }}
        currentUserId="u1"
        defaultAssigneeMode="self-when-allowed"
        projects={[
          { id: 'p1', name: 'Core' },
          { id: 'p2', name: 'Launch' }
        ]}
      />
    );

    const projectSelect = screen.getAllByRole('combobox')[0];
    expect(projectSelect).toHaveValue('p2');
    expect(screen.getAllByRole('combobox')).toHaveLength(3);
    expect(screen.getByDisplayValue('Alex')).toBeInTheDocument();
    expect(screen.getByDisplayValue('No priority')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add a task in under 5 seconds...')).toBeRequired();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });
});
