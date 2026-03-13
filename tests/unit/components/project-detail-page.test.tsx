import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProjectDetailPage from '@/app/(app)/projects/[projectId]/page';
import { loadProjectDetailPageData } from '@/lib/page-loaders/project-detail-page';

vi.mock('next/navigation', () => ({
  notFound: vi.fn()
}));
vi.mock('@/lib/page-loaders/project-detail-page', () => ({
  loadProjectDetailPageData: vi.fn()
}));
vi.mock('@/app/components/tasks/quick-add-form', () => ({
  QuickAddForm: ({ id }: { id?: string }) => <form id={id}>Quick Add</form>
}));
vi.mock('@/app/components/projects/project-setup-guide', () => ({
  ProjectSetupGuidePanel: () => <section id="project-setup-guide">Project setup</section>
}));
vi.mock('@/app/components/projects/workflow-status-manager', () => ({
  WorkflowStatusManager: ({ id }: { id?: string }) => <section id={id}>Workflow</section>
}));
vi.mock('@/app/components/projects/board-view', () => ({
  BoardView: () => <div>Board</div>
}));
vi.mock('@/app/components/tasks/task-row', () => ({
  TaskRow: () => <div>Task Row</div>
}));
vi.mock('@/app/components/tasks/task-drawer-panel', () => ({
  TaskDrawerPanel: () => <aside>Drawer</aside>
}));
vi.mock('@/app/components/ui/empty-state', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>
}));

describe('ProjectDetailPage', () => {
  it('renders the setup guide before the quick add target for empty projects', async () => {
    vi.mocked(loadProjectDetailPageData).mockResolvedValue({
      project: {
        id: 'p1',
        workspaceId: 'w1',
        name: 'Launch',
        description: null,
        privacy: 'workspace_visible',
        taskCount: 0,
        overdueCount: 0
      },
      tasks: [],
      assignees: [],
      workflowOptions: {
        taskStatuses: [],
        taskSections: [],
        boardStatuses: [],
        managerStatuses: []
      },
      setupGuide: {
        title: 'Set up this project in two quick steps',
        description: 'Review the workflow lanes first, then add and assign the first task without leaving the page.',
        actions: [
          { label: 'Review status lanes', href: '#workflow-status-manager' },
          { label: 'Add first task', href: '#quick-add-form' }
        ],
        tips: []
      },
      selectedTaskPanel: null,
      selectedTaskMode: 'details',
      recurringNotice: null
    } as never);

    const { container } = render(
      await ProjectDetailPage({
        params: Promise.resolve({ projectId: 'p1' }),
        searchParams: Promise.resolve({})
      })
    );

    const guide = container.querySelector('#project-setup-guide');
    const quickAdd = container.querySelector('#quick-add-form');

    expect(screen.getByText('Project setup')).toBeInTheDocument();
    expect(guide).toBeTruthy();
    expect(quickAdd).toBeTruthy();
    expect(guide?.compareDocumentPosition(quickAdd as Node)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });
});
