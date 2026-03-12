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
        { id: 'w1', name: 'Ops', icon: null, role: 'admin' },
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

  it('renders onboarding checklist for an admin workspace that has no tasks yet', async () => {
    vi.mocked(loadProjectsPageData).mockResolvedValue({
      mode: 'workspace-detail',
      workspaces: [{ id: 'w1', name: 'Ops', icon: null, role: 'admin' }],
      activeWorkspace: { id: 'w1', name: 'Ops', icon: null, role: 'admin' },
      projects: [],
      teamAccess: {
        members: [
          {
            userId: 'u1',
            role: 'admin',
            createdAt: '2026-03-01T00:00:00.000Z',
            email: 'alex@example.com',
            displayName: 'Alex',
            avatarUrl: null,
            initials: 'AL'
          }
        ],
        pendingInvites: []
      },
      onboarding: {
        title: 'Start your first workflow',
        description:
          'Create the first project now, then add a task to confirm the workflow end to end.',
        steps: [
          {
            id: 'workspace',
            title: 'Workspace created',
            description: 'Your team space is ready.',
            status: 'complete'
          },
          {
            id: 'invite',
            title: 'Invite teammates',
            description: 'Optional for solo setup. A pending invite counts as progress.',
            status: 'pending',
            optional: true
          },
          {
            id: 'project',
            title: 'Create first project',
            description: 'Start with one project for the team or workflow you are setting up.',
            status: 'current'
          },
          {
            id: 'task',
            title: 'Add first task',
            description: 'Use the first task to confirm the workflow feels right.',
            status: 'pending'
          }
        ],
        primaryAction: {
          label: 'Create first project',
          href: '#create-project-form'
        },
        secondaryAction: {
          label: 'Invite teammates',
          href: '#team-access-panel'
        }
      }
    });

    const { container } = render(await ProjectsPage({ searchParams: Promise.resolve({ workspace: 'w1' }) }));

    expect(screen.getByText('Workspace onboarding')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create first project' })).toHaveAttribute(
      'href',
      '#create-project-form'
    );
    expect(screen.getByRole('link', { name: 'Invite teammates' })).toHaveAttribute(
      'href',
      '#team-access-panel'
    );
    expect(screen.getByText('Members and invites')).toBeInTheDocument();
    expect(container.querySelector('#create-project-form')).toBeTruthy();
    expect(container.querySelector('#team-access-panel')).toBeTruthy();
  });

  it('renders active workspace project list without onboarding when the workspace already has tasks', async () => {
    vi.mocked(loadProjectsPageData).mockResolvedValue({
      mode: 'workspace-detail',
      workspaces: [{ id: 'w1', name: 'Ops', icon: null, role: 'admin' }],
      activeWorkspace: { id: 'w1', name: 'Ops', icon: null, role: 'admin' },
      projects: [
        {
          id: 'p1',
          workspaceId: 'w1',
          name: 'Core',
          description: null,
          privacy: 'workspace_visible',
          taskCount: 1,
          overdueCount: 0
        }
      ],
      teamAccess: null,
      onboarding: null
    });

    render(await ProjectsPage({ searchParams: Promise.resolve({ workspace: 'w1' }) }));

    expect(screen.getByText('Active workspace')).toBeInTheDocument();
    expect(screen.getByText('Core')).toBeInTheDocument();
    expect(screen.queryByText('Workspace onboarding')).not.toBeInTheDocument();
  });

  it('renders create workspace flow when loader returns create workspace mode', async () => {
    vi.mocked(loadProjectsPageData).mockResolvedValue({
      mode: 'create-workspace',
      workspaces: [{ id: 'w1', name: 'Ops', icon: null, role: 'admin' }]
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
