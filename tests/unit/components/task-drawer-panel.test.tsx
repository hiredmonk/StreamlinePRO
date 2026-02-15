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
  createTaskFromForm: vi.fn(),
  updateTaskFromForm: vi.fn(),
  uploadTaskAttachmentFromForm: vi.fn()
}));

describe('TaskDrawerPanel', () => {
  it('renders task details, attachment links, and empty-state labels', () => {
    render(
      <TaskDrawerPanel
        closeHref="/my-tasks"
        statuses={[{ id: 's1', name: 'To do' }]}
        sections={[{ id: 'sec1', name: 'Backlog' }]}
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
    expect(screen.getByRole('link', { name: 'brief.pdf' })).toHaveAttribute(
      'href',
      'https://cdn.example.com/brief.pdf'
    );
    expect(screen.getByText('No subtasks yet.')).toBeInTheDocument();
    expect(screen.getByText('No comments yet.')).toBeInTheDocument();
  });
});
