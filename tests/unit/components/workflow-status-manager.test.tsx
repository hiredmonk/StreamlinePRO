import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkflowStatusManager } from '@/app/components/projects/workflow-status-manager';

vi.mock('@/lib/actions/form-actions', () => ({
  createProjectStatusFromForm: vi.fn(),
  updateProjectStatusFromForm: vi.fn(),
  reorderProjectStatusesFromForm: vi.fn(),
  deleteProjectStatusFromForm: vi.fn()
}));

describe('WorkflowStatusManager', () => {
  it('renders guidance hints and lane controls', () => {
    render(
      <WorkflowStatusManager
        projectId="p1"
        statuses={[
          { id: 's1', name: 'To do', color: '#111111', is_done: false },
          { id: 's2', name: 'Done', color: '#1b7f4b', is_done: true }
        ]}
      />
    );

    expect(screen.getByText('Workflow settings')).toBeInTheDocument();
    expect(screen.getByText(/Done lanes are completion targets/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Add status (e.g. Blocked)')).toBeRequired();
    expect(screen.getAllByRole('button', { name: 'Save' })).toHaveLength(2);
    expect(screen.getAllByRole('button', { name: 'Delete lane' })).toHaveLength(2);
  });
});
