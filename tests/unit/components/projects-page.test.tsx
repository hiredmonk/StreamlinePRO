import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectsPage from '@/app/(app)/projects/page';
import { requireUser } from '@/lib/auth';
import { getProjectsForWorkspace, getWorkspacesForUser } from '@/lib/domain/projects/queries';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  )
}));
vi.mock('@/lib/auth', () => ({ requireUser: vi.fn() }));
vi.mock('@/lib/domain/projects/queries', () => ({
  getWorkspacesForUser: vi.fn(),
  getProjectsForWorkspace: vi.fn()
}));

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireUser).mockResolvedValue({
      user: { id: '11111111-1111-4111-8111-111111111111' } as never,
      supabase: { from: vi.fn() } as never
    });
  });

  it('renders all workspaces view when workspace is not selected', async () => {
    vi.mocked(getWorkspacesForUser).mockResolvedValue([
      { id: 'w1', name: 'Ops', icon: '⚙️', role: 'admin' },
      { id: 'w2', name: 'Marketing', icon: null, role: 'member' }
    ]);
    vi.mocked(getProjectsForWorkspace).mockResolvedValue([]);

    render(await ProjectsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText('All workspaces')).toBeInTheDocument();
    expect(screen.getByText('Workspace directory')).toBeInTheDocument();
    expect(screen.getByText('Ops').closest('a')).toHaveAttribute('href', '/projects?workspace=w1');
    expect(screen.getByRole('link', { name: 'Create workspace' })).toHaveAttribute(
      'href',
      '/projects?workspace=new'
    );
    expect(getProjectsForWorkspace).not.toHaveBeenCalled();
  });

  it('renders active workspace project list when workspace query is selected', async () => {
    vi.mocked(getWorkspacesForUser).mockResolvedValue([
      { id: 'w1', name: 'Ops', icon: '⚙️', role: 'admin' },
      { id: 'w2', name: 'Marketing', icon: null, role: 'member' }
    ]);
    vi.mocked(getProjectsForWorkspace).mockResolvedValue([]);

    render(await ProjectsPage({ searchParams: Promise.resolve({ workspace: 'w1' }) }));

    expect(screen.getByText('Active workspace')).toBeInTheDocument();
    expect(screen.getByText('Ops')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create project' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('w1')).toHaveAttribute('name', 'workspaceId');
    expect(getProjectsForWorkspace).toHaveBeenCalledWith(expect.anything(), 'w1');
  });

  it('renders create workspace flow when workspace query is new', async () => {
    vi.mocked(getWorkspacesForUser).mockResolvedValue([
      { id: 'w1', name: 'Ops', icon: '⚙️', role: 'admin' }
    ]);
    vi.mocked(getProjectsForWorkspace).mockResolvedValue([]);

    render(await ProjectsPage({ searchParams: Promise.resolve({ workspace: 'new' }) }));

    expect(screen.getByText('Workspace setup')).toBeInTheDocument();
    expect(screen.getByText('Create another workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All workspaces' })).toHaveAttribute(
      'href',
      '/projects'
    );
    expect(getProjectsForWorkspace).not.toHaveBeenCalled();
  });
});
