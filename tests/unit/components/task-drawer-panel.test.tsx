import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskDrawerPanel } from '@/app/components/tasks/task-drawer-panel';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  )
}));
vi.mock('@/lib/actions/form-actions', () => ({
  addCommentFromForm: vi.fn(),
  completeTaskFromForm: vi.fn(),
  createFollowUpTaskFromForm: vi.fn(),
  createTaskFromForm: vi.fn(),
  updateTaskFromForm: vi.fn(),
  uploadTaskAttachmentFromForm: vi.fn()
}));

describe('TaskDrawerPanel', () => {
  it('renders task details, attachment links, and empty-state labels', () => {
    render(
      <TaskDrawerPanel
        closeHref="/my-tasks"
        completionReturnTo="/my-tasks?task=t1&completed=1"
        statuses={[{ id: 's1', name: 'To do' }]}
        sections={[{ id: 'sec1', name: 'Backlog' }]}
        assignees={[
          {
            userId: 'u2',
            email: 'owner@example.com',
            displayName: 'Owner',
            avatarUrl: null,
            initials: 'OW'
          }
        ]}
        subtasks={[]}
        comments={[]}
        activity={[]}
        task={{
          id: 't1',
          project_id: 'p1',
          section_id: 'sec1',
          status_id: 's1',
          title: 'Write spec',
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
          status: { id: 's1', name: 'To do', color: '#111', is_done: false },
          section: { id: 'sec1', name: 'Backlog' }
        }}
        attachments={[
          {
            id: 'a1',
            file_name: 'brief.pdf',
            mime_type: 'application/pdf',
            size: 4096,
            created_at: '2026-02-15T10:00:00.000Z',
            uploaded_by: 'u1',
            storage_path: 'w/t1/brief.pdf',
            signed_url: 'https://cdn.example.com/brief.pdf'
          }
        ]}
      />
    );

    expect(screen.getByText('Write spec')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Unassigned')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Complete task' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'brief.pdf' })).toHaveAttribute(
      'href',
      'https://cdn.example.com/brief.pdf'
    );
    expect(screen.getByText('No subtasks yet.')).toBeInTheDocument();
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });

  it('renders completion state with follow-up guidance', () => {
    render(
      <TaskDrawerPanel
        closeHref="/my-tasks"
        mode="completed"
        recurringNotice="The recurring series already generated the next task."
        statuses={[{ id: 's1', name: 'Done' }]}
        sections={[]}
        assignees={[]}
        subtasks={[]}
        comments={[]}
        activity={[]}
        attachments={[]}
        task={{
          id: 't1',
          project_id: 'p1',
          section_id: null,
          status_id: 's1',
          title: 'Write spec',
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
          completed_at: '2026-02-15T10:00:00.000Z',
          project: { id: 'p1', name: 'Core' },
          status: { id: 's1', name: 'Done', color: '#111', is_done: true },
          section: null
        }}
      />
    );

    expect(screen.getByText('Task marked done')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create follow-up' })).toBeInTheDocument();
    expect(screen.getByText('The recurring series already generated the next task.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create follow-up' })).toBeInTheDocument();
  });
});

