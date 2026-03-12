# Workspace Members and Assignee UX - FEATURE_BLUEPRINT

## Pattern Map
| Concern | Existing Pattern | Source File(s) | Reuse Decision |
|---|---|---|---|
| Authenticated server-page assembly | Page routes stay thin and consume server loaders | `app/(app)/projects/page.tsx`, `app/(app)/my-tasks/page.tsx`, `app/(app)/projects/[projectId]/page.tsx`, `lib/page-loaders/projects-page.ts`, `lib/page-loaders/my-tasks-page.ts`, `lib/page-loaders/project-detail-page.ts` | Reuse loader-first page assembly for Team access data and assignee option data |
| Declarative server-action forms | Server actions are wrapped for direct form submission without extra client hooks | `lib/actions/form-actions.ts`, `app/components/projects/team-access-panel.tsx` | Reuse direct form posts for invite create/cancel, role update, member removal, and inline assignee edits |
| Server-side domain helpers | Shared server helpers centralize collaboration and eligibility logic | `lib/domain/workspaces/invites.ts`, `lib/domain/workspaces/queries.ts`, `lib/domain/tasks/assignees.ts` | Reuse domain helpers for invite lifecycle, member directory data, and assignee authorization |
| OAuth redirect preservation | Auth start/callback routes preserve validated query state across Google auth | `app/auth/google/route.ts`, `app/auth/callback/route.ts` | Reuse redirect/query preservation for `workspaceInvite` plus `next` |
| Thin presentational task surfaces | Task row, drawer, and board render view-model data and submit focused mutations | `app/components/tasks/task-row.tsx`, `app/components/tasks/task-drawer-panel.tsx`, `app/components/projects/board-view.tsx` | Reuse the same assignee display/edit contract across all task surfaces |
| Server-side profile enrichment | Auth-user profile data is resolved before rendering | `lib/page-loaders/project-assignees.ts`, `lib/page-loaders/workspace-team-access.ts`, `PATTERNS.md` | Standardize sanitized member/assignee view models instead of UI-owned profile lookups |

## Interface
These are the lasting product and engineering contracts for the P0 members/assignees feature.

## Feature List
- Workspace invite lifecycle
- Workspace member directory and role management
- Assignee display and edit UX across list, drawer, and board surfaces

### Route and Query Contracts
- Admin workspace management lives on the active workspace Projects page: `/projects?workspace=<id>`.
- The sign-in flow accepts `workspaceInvite=<inviteId>` and preserves it through `/auth/google` and `/auth/callback` together with validated `next`.
- Invite acceptance is Google-first and succeeds only when the authenticated email matches the invited email.

### Data Contracts
```ts
type WorkspaceRole = 'admin' | 'member';

interface WorkspaceInviteRecord {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedBy: string;
  acceptedUserId: string | null;
  createdAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
}

interface WorkspaceMemberSummary {
  userId: string;
  role: WorkspaceRole;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
}

interface PendingWorkspaceInvite {
  id: string;
  email: string;
  role: WorkspaceRole;
  createdAt: string;
}

interface AssignableMemberOption {
  userId: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
}
```

### Behavior Contracts
- Team access panel contains:
  - invite form with email + role
  - pending invite list with cancel action
  - member directory with role selector and remove action
- Pending invites support create and cancel only in P0. Resend is deferred.
- Last-admin guard applies to both role demotion and member removal.
- Removing a workspace member must:
  - delete that user's `project_members` rows for projects in the same workspace
  - unassign that user's incomplete tasks in the same workspace
- Assignee eligibility rules:
  - `workspace_visible`: any workspace member
  - `private`: current project members only
- If task creation omits an assignee and the creator is not eligible under the project rule, the stored assignee must remain `null`.

## Edge Cases
- Duplicate active invite for the same workspace/email should be rejected.
- Invite acceptance with a revoked, missing, or already-consumed invite should fail safely.
- Invite acceptance with a different authenticated email should fail with a user-visible mismatch error.
- The last remaining workspace admin cannot be removed or demoted.
- Removing a member must not leave stale private-project memberships or incomplete-task assignees behind.
- Completed tasks are not part of the required unassignment cleanup rule for P0.
- A private project's assignee picker must not imply that project membership can be edited from the same UI.

## Tests-First Map
- `tests/unit/actions/workspace-actions.test.ts`
  - duplicate invite rejection
  - invite acceptance and mismatch handling
  - last-admin guard
  - member removal cleanup
- `tests/unit/api/auth-routes.test.ts`
  - `workspaceInvite` and `next` survive Google auth redirect/callback flow
- `tests/unit/components/signin-page.test.tsx`
  - invite context banner and error states
- `tests/unit/components/projects-page.test.tsx`
  - admin-only Team access panel rendering
- `tests/unit/components/task-row.test.tsx`
- `tests/unit/components/task-drawer-panel.test.tsx`
- `tests/unit/components/board-view.test.tsx`
  - assignee rendering and editing affordances
- `tests/unit/actions/task-actions.test.ts`
  - allowed/disallowed assignees by project privacy
  - null fallback when creator is not eligible

## Out of Scope
- Private-project membership management UI
- Invite resend UX
- Non-Google invite acceptance paths
- Broader guest/external-collaborator permission design
