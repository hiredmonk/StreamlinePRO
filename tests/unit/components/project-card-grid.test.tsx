import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProjectCardGrid } from '@/app/components/projects/project-card-grid';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  )
}));

describe('ProjectCardGrid', () => {
  it('renders project cards with fallback description and counters', () => {
    render(
      <ProjectCardGrid
        projects={[
          {
            id: 'p1',
            workspaceId: 'w1',
            name: 'Roadmap',
            description: null,
            privacy: 'workspace_visible',
            taskCount: 4,
            overdueCount: 1
          }
        ]}
      />
    );

    expect(screen.getByText('Roadmap')).toBeInTheDocument();
    expect(screen.getByText('No description yet.')).toBeInTheDocument();
    expect(screen.getByText('4 tasks')).toBeInTheDocument();
    expect(screen.getByText('1 overdue')).toBeInTheDocument();
  });
});
