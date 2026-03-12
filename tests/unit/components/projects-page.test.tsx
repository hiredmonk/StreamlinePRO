import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectsPage from '@/app/(app)/projects/page';
import { loadProjectsPageData } from '@/lib/page-loaders/projects-page';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  )
}));
vi.mock('@/lib/page-loaders/projects-page', () => ({
  loadProjectsPageData: vi.fn()
}));

describe('ProjectsPage', () => {
  it('renders all workspaces view when loader returns workspace directory mode', async () => {
    vi.mocked(loadProjectsPageData).mockResolvedValue({
      mode: 'workspace-directory',
      workspaces: [
        { id: 'w1', name: 'Ops', icon: '⚙', role: 'admin' },
        { id: 'w2', name: 'Marketing', icon: null, role: 'member' }
      ]
    });

    render(await ProjectsPage({ searchParams: Promise.resolve({}) }));

    expect(screen.getByText('All workspaces')).toBeInTheDocument();
    expect(screen.getByText('Workspace directory')).toBeInTheDocument();
    expect(screen.getByText('Ops').closest('a')).toHaveAttribute('href', '/projects?workspace=w1');
    expect(screen.getByRole('link', { name: 'Create workspace' })).toHaveAttribute(
      'href',
      '/projects?workspace=new'
    );
  });

  it('renders active workspace project list when loader returns workspace detail mode', async () => {
    vi.mocked(loadProjectsPageData).mockResolvedValue({
      mode: 'workspace-detail',
      workspaces: [{ id: 'w1', name: 'Ops', icon: '⚙', role: 'admin' }],
      activeWorkspace: { id: 'w1', name: 'Ops', icon: '⚙', role: 'admin' },
      projects: []
    });

    render(await ProjectsPage({ searchParams: Promise.resolve({ workspace: 'w1' }) }));

    expect(screen.getByText('Active workspace')).toBeInTheDocument();
    expect(screen.getByText('Ops')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create project' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('w1')).toHaveAttribute('name', 'workspaceId');
  });

  it('renders create workspace flow when loader returns create workspace mode', async () => {
    vi.mocked(loadProjectsPageData).mockResolvedValue({
      mode: 'create-workspace',
      workspaces: [{ id: 'w1', name: 'Ops', icon: '⚙', role: 'admin' }]
    });

    render(await ProjectsPage({ searchParams: Promise.resolve({ workspace: 'new' }) }));

    expect(screen.getByText('Workspace setup')).toBeInTheDocument();
    expect(screen.getByText('Create another workspace')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create workspace' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All workspaces' })).toHaveAttribute(
      'href',
      '/projects'
    );
  });
});
