import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MyTasksFilters } from '@/app/components/tasks/my-tasks-filters';

const push = vi.fn();

vi.mock('next/navigation', () => ({
  usePathname: () => '/my-tasks',
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams('workspace=w1')
}));

describe('MyTasksFilters', () => {
  it('pushes updated quick-filter query params', () => {
    render(
      <MyTasksFilters
        filters={{
          activeWorkspaceId: 'w1',
          workspaceOptions: [
            { id: 'w1', name: 'Ops' },
            { id: 'w2', name: 'Marketing' }
          ],
          projectOptions: [{ id: 'p1', name: 'Core' }],
          statusOptions: [{ id: 's1', name: 'Waiting', label: 'Core - Waiting' }],
          selectedProjectId: null,
          selectedStatusId: null,
          selectedQuickFilter: null,
          hasActiveFilters: false
        }}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Waiting' }));

    expect(push).toHaveBeenCalledWith('/my-tasks?workspace=w1&quick=waiting');
  });
});
