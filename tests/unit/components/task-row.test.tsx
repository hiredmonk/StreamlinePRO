import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskRow } from '@/app/components/tasks/task-row';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  )
}));
vi.mock('@/lib/actions/form-actions', () => ({
  completeTaskFromForm: vi.fn(),
  updateTaskFromForm: vi.fn()
}));

describe('TaskRow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
  });

  it('renders overdue state and inline controls', () => {
    render(
      <TaskRow
        drawerHref="/my-tasks?task=t1"
        statuses={[
          { id: 's1', name: 'To do' },
          { id: 's2', name: 'Done' }
        ]}
        sections={[{ id: 'sec1', name: 'Backlog' }]}
        task={{
          id: 't1',
          project_id: 'p1',
          section_id: 'sec1',
          status_id: 's1',
          title: 'Pay vendors',
          description: null,
          assignee_id: 'u1',
          creator_id: 'u1',
          due_at: '2026-02-14T10:00:00.000Z',
          due_timezone: 'UTC',
          priority: 'high',
          parent_task_id: null,
          recurrence_id: null,
          is_today: false,
          sort_order: 1,
          completed_at: null,
          project: { id: 'p1', name: 'Finance' },
          status: { id: 's1', name: 'To do', color: '#111', is_done: false },
          section: { id: 'sec1', name: 'Backlog' }
        }}
      />
    );

    expect(screen.getByText('Pay vendors')).toBeInTheDocument();
    expect(screen.getByText('Overdue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });
});
