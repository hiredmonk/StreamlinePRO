import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BoardView } from '@/app/components/projects/board-view';
import { moveTaskWithConcurrencyAction } from '@/lib/actions/task-actions';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  )
}));
vi.mock('@/lib/actions/task-actions', () => ({
  moveTaskWithConcurrencyAction: vi.fn(async () => ({
    ok: true,
    data: {
      taskId: 't1',
      projectId: 'p1',
      statusId: 'done',
      sectionId: null,
      sortOrder: 1,
      laneVersion: 2
    }
  }))
}));

describe('BoardView', () => {
  it('moves task between status columns on drop', async () => {
    render(
      <BoardView
        projectId="p1"
        actorUserId="11111111-1111-4111-8111-111111111111"
        drawerPathname="/projects/p1"
        statuses={[
          { id: 'todo', name: 'To do', color: '#000', laneVersion: 0 },
          { id: 'done', name: 'Done', color: '#0a0', laneVersion: 1 }
        ]}
        tasks={[
          {
            id: 't1',
            project_id: 'p1',
            section_id: null,
            status_id: 'todo',
            title: 'Task A',
            description: null,
            assignee_id: null,
            creator_id: 'u1',
            due_at: null,
            due_timezone: null,
            priority: null,
            parent_task_id: null,
            recurrence_id: null,
            is_today: false,
            sort_order: 1,
            completed_at: null,
            project: { id: 'p1', name: 'Core' },
            status: { id: 'todo', name: 'To do', color: '#000', is_done: false },
            section: null
          }
        ]}
      />
    );

    const dropZone = screen.getByText('Drop tasks here').closest('div');
    expect(dropZone).toBeTruthy();

    fireEvent.drop(dropZone as Element, {
      dataTransfer: {
        getData: () => 't1'
      }
    });

    await waitFor(() => {
      expect(moveTaskWithConcurrencyAction).toHaveBeenCalledWith(
        expect.objectContaining({
          taskId: 't1',
          projectId: 'p1',
          fromStatusId: 'todo',
          toStatusId: 'done',
          targetIndex: 0,
          expectedLaneVersion: 1,
          actorUserId: '11111111-1111-4111-8111-111111111111'
        })
      );
    });
  });

  it('renders all columns when project has more than four statuses', () => {
    render(
      <BoardView
        projectId="p2"
        actorUserId="11111111-1111-4111-8111-111111111111"
        drawerPathname="/projects/p2"
        statuses={[
          { id: 's1', name: 'To do', color: '#111111', laneVersion: 0 },
          { id: 's2', name: 'Doing', color: '#222222', laneVersion: 0 },
          { id: 's3', name: 'Waiting', color: '#333333', laneVersion: 0 },
          { id: 's4', name: 'Review', color: '#444444', laneVersion: 0 },
          { id: 's5', name: 'Done', color: '#555555', laneVersion: 0 }
        ]}
        tasks={[]}
      />
    );

    expect(screen.getByText('To do')).toBeInTheDocument();
    expect(screen.getByText('Doing')).toBeInTheDocument();
    expect(screen.getByText('Waiting')).toBeInTheDocument();
    expect(screen.getByText('Review')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });
});
