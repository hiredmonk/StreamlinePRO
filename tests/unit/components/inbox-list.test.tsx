import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { InboxList } from '@/app/components/inbox/inbox-list';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  )
}));
vi.mock('@/lib/actions/form-actions', () => ({
  markNotificationReadFromForm: vi.fn()
}));

describe('InboxList', () => {
  it('shows mark-read action for unread task notifications', () => {
    render(
      <InboxList
        items={[
          {
            id: 'n1',
            type: 'assignment',
            entity_type: 'task',
            entity_id: 'task-1234',
            payload_json: {},
            read_at: null,
            created_at: '2026-02-15T10:00:00.000Z'
          }
        ]}
      />
    );

    expect(screen.getByRole('link', { name: 'Open task' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeInTheDocument();
  });

  it('shows read state for already-read notifications', () => {
    render(
      <InboxList
        items={[
          {
            id: 'n2',
            type: 'system',
            entity_type: 'project',
            entity_id: 'project-1',
            payload_json: {},
            read_at: '2026-02-15T12:00:00.000Z',
            created_at: '2026-02-15T10:00:00.000Z'
          }
        ]}
      />
    );

    expect(screen.getByText('Read')).toBeInTheDocument();
  });
});
