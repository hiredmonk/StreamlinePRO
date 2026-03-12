import { describe, expect, it } from 'vitest';
import {
  buildProjectSetupGuide,
  buildWorkspaceOnboarding
} from '@/lib/view-models/onboarding';

describe('buildWorkspaceOnboarding', () => {
  it('returns null for non-admin users', () => {
    expect(
      buildWorkspaceOnboarding({
        isAdmin: false,
        projects: [],
        teamAccess: null
      })
    ).toBeNull();
  });

  it('builds the first-project checklist for an empty admin workspace', () => {
    const onboarding = buildWorkspaceOnboarding({
      isAdmin: true,
      projects: [],
      teamAccess: {
        members: [{}],
        pendingInvites: []
      }
    });

    expect(onboarding?.primaryAction).toEqual({
      label: 'Create first project',
      href: '#create-project-form'
    });
    expect(onboarding?.secondaryAction).toEqual({
      label: 'Invite teammates',
      href: '#team-access-panel'
    });
    expect(onboarding?.steps).toEqual([
      expect.objectContaining({ id: 'workspace', status: 'complete' }),
      expect.objectContaining({ id: 'invite', status: 'pending', optional: true }),
      expect.objectContaining({ id: 'project', status: 'current' }),
      expect.objectContaining({ id: 'task', status: 'pending' })
    ]);
  });

  it('switches the current step to first task once a project exists', () => {
    const onboarding = buildWorkspaceOnboarding({
      isAdmin: true,
      projects: [{ id: 'p1', name: 'Launch', taskCount: 0 }],
      teamAccess: {
        members: [{}, {}],
        pendingInvites: []
      }
    });

    expect(onboarding?.primaryAction).toEqual({
      label: 'Open Launch',
      href: '/projects/p1#project-setup-guide'
    });
    expect(onboarding?.secondaryAction).toEqual({
      label: 'Review invites',
      href: '#team-access-panel'
    });
    expect(onboarding?.steps).toEqual([
      expect.objectContaining({ id: 'workspace', status: 'complete' }),
      expect.objectContaining({ id: 'invite', status: 'complete' }),
      expect.objectContaining({ id: 'project', status: 'complete' }),
      expect.objectContaining({ id: 'task', status: 'current' })
    ]);
  });

  it('returns null once any task exists in the workspace', () => {
    expect(
      buildWorkspaceOnboarding({
        isAdmin: true,
        projects: [{ id: 'p1', name: 'Launch', taskCount: 1 }],
        teamAccess: null
      })
    ).toBeNull();
  });
});

describe('buildProjectSetupGuide', () => {
  it('returns a guide for empty projects only', () => {
    expect(buildProjectSetupGuide(1)).toBeNull();

    expect(buildProjectSetupGuide(0)).toEqual({
      title: 'Set up this project in two quick steps',
      description: 'Review the default status lanes, then add the first task without leaving the page.',
      actions: [
        { label: 'Review status lanes', href: '#workflow-status-manager' },
        { label: 'Add first task', href: '#quick-add-form' }
      ],
      tips: [
        'Keep the default lanes if they already fit. You can rename or reorder them later.',
        'Create one real task first so the team can validate status flow before adding more.'
      ]
    });
  });
});
