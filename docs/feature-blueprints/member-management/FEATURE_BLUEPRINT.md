# Member Management UX - FEATURE_BLUEPRINT

## Pattern Map
| Concern | Existing Pattern | Source File(s) | Reuse Decision |
|---|---|---|---|
| Server mutation shape | `ActionResult<T>` union with `{ ok, data/error }` | `lib/actions/types.ts` | Reuse for all member-management action signatures |
| Auth guard + server actions | `'use server'` actions call `requireUser()` and return typed failures | `lib/actions/project-actions.ts`, `lib/actions/task-actions.ts` | Reuse for invite/remove/role mutations |
| Form-to-action adapters | `*FromForm` helpers parse `FormData` and call action functions | `lib/actions/form-actions.ts` | Reuse for invite/member role forms |
| Validation style | Zod schemas in `lib/validators/*` with refine checks for invariants | `lib/validators/project.ts`, `lib/validators/task.ts` | Reuse for role transitions and duplicate invite checks |
| Workspace role semantics | Workspace roles are `admin` and `member` | `lib/domain/projects/queries.ts`, `db/migrations/202602151300_init.sql` | Reuse without introducing new role enums |
| Permission/risk conventions | RLS failures surfaced as explicit error text | `tests/unit/actions/project-actions.test.ts` | Reuse for access-denied and last-admin constraints |
| UI placement | Workspace-aware project and sidebar views | `app/(app)/projects/page.tsx`, `app/components/layout/app-sidebar.tsx` | Place member management under workspace context |

## Interface (Engineering Drawings)
These interfaces are the engineering drawings for implementing workspace member invite/remove/role-management UX.

## Feature List
- Member invite flow
- Member removal flow
- Member role update flow

### Input Types
```ts
export type WorkspaceRole = 'admin' | 'member';

export interface InviteWorkspaceMemberInput {
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  invitedByUserId: string;
}

export interface UpdateWorkspaceMemberRoleInput {
  workspaceId: string;
  memberUserId: string;
  nextRole: WorkspaceRole;
  actorUserId: string;
}

export interface RemoveWorkspaceMemberInput {
  workspaceId: string;
  memberUserId: string;
  actorUserId: string;
  reason?: string;
}

export interface ListWorkspaceMembersInput {
  workspaceId: string;
  actorUserId: string;
}
```

### Output Types
```ts
export interface InviteWorkspaceMemberOutput {
  workspaceId: string;
  memberUserId: string;
  role: WorkspaceRole;
  invitedAt: string;
}

export interface UpdateWorkspaceMemberRoleOutput {
  workspaceId: string;
  memberUserId: string;
  previousRole: WorkspaceRole;
  nextRole: WorkspaceRole;
  updatedAt: string;
}

export interface RemoveWorkspaceMemberOutput {
  workspaceId: string;
  removedUserId: string;
  removedAt: string;
}

export interface WorkspaceMemberSummary {
  workspaceId: string;
  userId: string;
  email: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface ListWorkspaceMembersOutput {
  workspaceId: string;
  members: WorkspaceMemberSummary[];
}
```

### Function Signatures
```ts
export type InviteWorkspaceMemberAction = (
  input: InviteWorkspaceMemberInput
) => Promise<ActionResult<InviteWorkspaceMemberOutput>>;

export type UpdateWorkspaceMemberRoleAction = (
  input: UpdateWorkspaceMemberRoleInput
) => Promise<ActionResult<UpdateWorkspaceMemberRoleOutput>>;

export type RemoveWorkspaceMemberAction = (
  input: RemoveWorkspaceMemberInput
) => Promise<ActionResult<RemoveWorkspaceMemberOutput>>;

export type ListWorkspaceMembersQuery = (
  input: ListWorkspaceMembersInput
) => Promise<ListWorkspaceMembersOutput>;
```

## Edge Cases
- Invite email already belongs to an existing workspace member.
- Actor attempts to demote or remove the last remaining `admin` in a workspace.
- Actor attempts to remove themselves while they are the final admin.
- Member removed during an active session must lose access immediately (RLS enforcement + cache revalidation).
- Role update race: two admins updating same member role concurrently.
- Invite accepted after actor/admin permissions were revoked.

## Out of Scope (No Logic Yet)
- Database migration changes.
- Email invite transport implementation.
- UI rendering and interaction logic.
