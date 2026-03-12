export type OnboardingAction = {
  label: string;
  href: string;
};

export type OnboardingStepStatus = 'complete' | 'current' | 'pending';

export type WorkspaceOnboardingStep = {
  id: 'workspace' | 'invite' | 'project' | 'task';
  title: string;
  description: string;
  status: OnboardingStepStatus;
  optional?: boolean;
};

export type WorkspaceOnboardingState = {
  title: string;
  description: string;
  steps: WorkspaceOnboardingStep[];
  primaryAction: OnboardingAction;
  secondaryAction?: OnboardingAction;
};

export type ProjectSetupGuide = {
  title: string;
  description: string;
  actions: OnboardingAction[];
  tips: string[];
};

type WorkspaceOnboardingInput = {
  isAdmin: boolean;
  projects: Array<{
    id: string;
    name: string;
    taskCount: number;
  }>;
  teamAccess: {
    members: Array<unknown>;
    pendingInvites: Array<unknown>;
  } | null;
};

export function buildWorkspaceOnboarding(
  input: WorkspaceOnboardingInput
): WorkspaceOnboardingState | null {
  if (!input.isAdmin) {
    return null;
  }

  const hasProject = input.projects.length > 0;
  const hasTask = input.projects.some((project) => project.taskCount > 0);

  if (hasTask) {
    return null;
  }

  const hasInviteMomentum =
    input.teamAccess !== null &&
    (input.teamAccess.members.length > 1 || input.teamAccess.pendingInvites.length > 0);

  const currentRequiredStep: WorkspaceOnboardingStep['id'] = hasProject ? 'task' : 'project';

  const steps: WorkspaceOnboardingStep[] = [
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
      status: hasInviteMomentum ? 'complete' : 'pending',
      optional: true
    },
    {
      id: 'project',
      title: 'Create first project',
      description: 'Start with one project for the team or workflow you are setting up.',
      status: hasProject ? 'complete' : currentRequiredStep === 'project' ? 'current' : 'pending'
    },
    {
      id: 'task',
      title: 'Add first task',
      description: 'Use the first task to confirm the workflow feels right.',
      status: currentRequiredStep === 'task' ? 'current' : 'pending'
    }
  ];

  return {
    title: hasProject ? 'Finish your first-workflow setup' : 'Start your first workflow',
    description: hasProject
      ? 'Your workspace is ready. Open the first project and add a task to complete the setup path.'
      : 'Create the first project now, then add a task to confirm the workflow end to end.',
    steps,
    primaryAction: hasProject
      ? {
          label: `Open ${input.projects[0]?.name ?? 'first project'}`,
          href: `/projects/${input.projects[0]?.id}#project-setup-guide`
        }
      : {
          label: 'Create first project',
          href: '#create-project-form'
        },
    secondaryAction:
      input.teamAccess === null
        ? undefined
        : {
            label: hasInviteMomentum ? 'Review invites' : 'Invite teammates',
            href: '#team-access-panel'
          }
  };
}

export function buildProjectSetupGuide(taskCount: number): ProjectSetupGuide | null {
  if (taskCount > 0) {
    return null;
  }

  return {
    title: 'Set up this project in two quick steps',
    description: 'Review the default status lanes, then add the first task without leaving the page.',
    actions: [
      {
        label: 'Review status lanes',
        href: '#workflow-status-manager'
      },
      {
        label: 'Add first task',
        href: '#quick-add-form'
      }
    ],
    tips: [
      'Keep the default lanes if they already fit. You can rename or reorder them later.',
      'Create one real task first so the team can validate status flow before adding more.'
    ]
  };
}
