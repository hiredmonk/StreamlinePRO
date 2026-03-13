# Workspace Onboarding - FEATURE_BLUEPRINT

## Pattern Map
| Concern | Existing Pattern | Source File(s) | Reuse Decision |
|---|---|---|---|
| Thin authenticated pages | Route pages stay small and consume server loader state | `app/(app)/projects/page.tsx`, `app/(app)/projects/[projectId]/page.tsx`, `lib/page-loaders/projects-page.ts`, `lib/page-loaders/project-detail-page.ts` | Keep onboarding state server-derived and pass render-ready contracts into presentational components |
| Presenter helpers | Pure view-model helpers derive render metadata without React state | `lib/view-models/task-row.ts`, `lib/view-models/inbox-item.ts`, `PATTERNS.md` | Derive checklist/setup-guide state in `lib/view-models/onboarding.ts` instead of embedding logic inside pages |
| Direct server-action forms | Existing forms submit straight to server actions without client hooks | `lib/actions/form-actions.ts`, `app/components/projects/create-project-form.tsx`, `app/components/tasks/quick-add-form.tsx` | Reuse the same forms and point onboarding CTAs at them with anchors instead of building a wizard |
| Admin workspace management | Workspace-specific setup already lives on `/projects?workspace=<id>` | `app/components/projects/team-access-panel.tsx`, `lib/page-loaders/workspace-team-access.ts` | Keep invite guidance on the active workspace Projects view |

## Interface
### Internal Contracts
- `createWorkspaceFromForm` redirects successful first-workspace creation to `/projects?workspace=<workspaceId>`.
- `loadProjectsPageData` returns `onboarding: WorkspaceOnboardingState | null` on `workspace-detail`.
- `loadProjectDetailPageData` returns `setupGuide: ProjectSetupGuide | null`.
- `CreateProjectForm`, `TeamAccessPanel`, `QuickAddForm`, and `WorkflowStatusManager` expose stable anchors for onboarding CTAs.

### View-Model Contracts
```ts
type WorkspaceOnboardingState = {
  title: string;
  description: string;
  steps: Array<{
    id: 'workspace' | 'invite' | 'project' | 'task';
    title: string;
    description: string;
    status: 'complete' | 'current' | 'pending';
    optional?: boolean;
  }>;
  primaryAction: { label: string; href: string };
  secondaryAction?: { label: string; href: string };
};

type ProjectSetupGuide = {
  title: string;
  description: string;
  actions: Array<{ label: string; href: string }>;
  tips: string[];
};
```

## Behavior Contracts
- Show the workspace onboarding checklist only for admins on the active workspace Projects page.
- Hide the workspace checklist as soon as any project in that workspace has at least one task.
- Checklist steps are:
  - workspace created: always complete
  - invite teammates: optional; complete when the workspace has more than one member or at least one pending invite
  - create first project: complete when the workspace has at least one project
  - add first task: complete when any project in the workspace has at least one task
- Checklist CTA behavior:
  - no projects: primary CTA jumps to the create-project form
  - projects but no tasks: primary CTA opens the newest project detail page
  - when Team access data is available: secondary CTA jumps to the invite panel
- Empty project detail shows a setup guide near the top of the page until the first task exists.
- The setup guide links only to existing workflow-status and Quick Add UI. It does not introduce a multi-step wizard, modal, or extra mutations.

## Edge Cases
- Non-admins never see the workspace checklist.
- Team access loader failure should not block the rest of onboarding; omit invite-specific CTA/progress if that data is unavailable.
- A pending invite counts as invite progress so solo admins are not forced to wait for acceptance before moving on.
- Project-detail guidance can appear on any empty project, but workspace-level onboarding remains tied to first-task completion across the workspace.

## Tests-First Map
- `tests/unit/view-models/onboarding.test.ts`
  - admin vs non-admin visibility
  - project/task progression
  - optional invite completion
- `tests/unit/actions/form-actions.test.ts`
  - workspace-create redirect target
- `tests/unit/page-loaders/projects-page.test.ts`
  - onboarding state for empty/admin/non-admin/degraded team-access cases
- `tests/unit/components/projects-page.test.tsx`
  - checklist rendering and CTA targets
- `tests/unit/page-loaders/project-detail-page.test.ts`
  - setup guide present only for zero-task projects
- `tests/unit/components/workspace-onboarding-panel.test.tsx`
- `tests/unit/components/project-setup-guide.test.tsx`

## Out of Scope
- Sign-in page education
- Sidebar workspace persistence or "last active workspace" memory
- New database state to persist onboarding progress
- Playwright coverage that depends on authenticated seeded workspace/project data
