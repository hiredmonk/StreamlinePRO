# Task Home and Completion UX - FEATURE_BLUEPRINT

## Pattern Map
| Concern | Existing Pattern | Source File(s) | Reuse Decision |
|---|---|---|---|
| Server-rendered page assembly | Thin authenticated routes consume typed loader results | `app/(app)/my-tasks/page.tsx`, `app/(app)/projects/[projectId]/page.tsx`, `lib/page-loaders/my-tasks-page.ts`, `lib/page-loaders/project-detail-page.ts` | Keep My Tasks and project detail pages server-first and extend loader contracts instead of moving task filtering into client-only state |
| Query-param drawer context | Task details stay in context through `?task=<id>` | `app/(app)/my-tasks/page.tsx`, `app/(app)/projects/[projectId]/page.tsx`, `lib/page-loaders/task-drawer.ts`, `architecture.md` | Reuse the drawer query-param pattern for post-completion state instead of introducing a modal route |
| Direct server-action forms | Declarative forms submit directly to server actions until draft state is required | `app/components/tasks/quick-add-form.tsx`, `app/components/tasks/task-row.tsx`, `lib/actions/form-actions.ts`, `PATTERNS.md` | Keep mutation entrypoints as form actions while allowing Quick Add to own local draft state for project-dependent defaults |
| Server-side assignee eligibility | Project assignment scope and profile enrichment stay server-derived | `lib/domain/tasks/assignees.ts`, `lib/page-loaders/project-assignees.ts`, `docs/feature-blueprints/workspace-members-assignee-ux/FEATURE_BLUEPRINT.md` | Reuse the same assignee options and eligibility rules for filters, Quick Add, drawer follow-up, and manager assignment affordances |
| Presenter-style onboarding copy | Pure view-model helpers derive guidance content for empty/setup states | `lib/view-models/onboarding.ts`, `app/components/projects/project-setup-guide.tsx`, `docs/feature-blueprints/workspace-onboarding/FEATURE_BLUEPRINT.md` | Reuse onboarding view models for clearer workflow/assignment guidance instead of scattering copy logic through pages |

## Interface

### Route and Search Contracts
- `/my-tasks` accepts:
  - `workspace=<workspaceId>`
  - `project=<projectId>`
  - `status=<statusId>`
  - `quick=waiting|due-this-week|unassigned`
  - `task=<taskId>`
  - `completed=1` when the selected drawer should render the completion state
  - `recurring=1` when the completion state should show the recurring next-task notice
- `workspace` defaults to the first accessible workspace when omitted.
- `project` and `status` must belong to the selected workspace or they are ignored.
- `task` continues to select the open drawer task on both My Tasks and project detail pages.

### Loader and View-Model Contracts
```ts
type MyTasksQuickFilter = 'waiting' | 'due-this-week' | 'unassigned';

type MyTasksSearch = {
  workspace?: string;
  project?: string;
  status?: string;
  quick?: MyTasksQuickFilter;
  task?: string;
  completed?: '1';
  recurring?: '1';
};

type MyTasksFilterState = {
  activeWorkspaceId: string;
  workspaceOptions: Array<{ id: string; name: string }>;
  projectOptions: Array<{ id: string; name: string }>;
  statusOptions: Array<{ id: string; name: string; label: string }>;
  selectedProjectId: string | null;
  selectedStatusId: string | null;
  selectedQuickFilter: MyTasksQuickFilter | null;
  hasActiveFilters: boolean;
};

type TaskDrawerMode = 'details' | 'completed';

type TaskDrawerCompletionState = {
  mode: TaskDrawerMode;
  message: string;
  recurringNextTaskNotice?: string;
};
```

### Form and Action Contracts
- `completeTaskFromForm` accepts optional `returnTo` and redirects back into the current page with `task=<id>&completed=1`.
- Quick Add accepts optional `assigneeId` and `priority` across My Tasks, project detail, and follow-up contexts.
- Follow-up creation uses a dedicated form action that:
  - creates a top-level task in the same project
  - inherits section, assignee, and priority from the source task
  - leaves due date empty
  - records `follow_up_created` activity on the source task

## Behavior Contracts
- Default My Tasks shows incomplete top-level tasks assigned to the current user within the selected workspace.
- `quick=unassigned` widens My Tasks to incomplete top-level tasks without an assignee in the selected workspace.
- `quick=waiting` filters by statuses whose normalized name is `waiting`.
- `quick=due-this-week` includes tasks due today through the next 7 days and excludes overdue tasks.
- The Today, Overdue, and Upcoming sections remain the top-level layout. Filters narrow the tasks inside those sections and do not replace them with a separate results view.
- My Tasks filter state is shareable and restorable from the URL.
- My Tasks Quick Add defaults assignee to the current user only when the selected project allows it. Priority defaults empty.
- Project-detail Quick Add keeps project context fixed but does not auto-fill assignee or priority.
- Follow-up creation from the task drawer or completion state inherits assignee and priority from the source task.
- Completing a task from list or drawer returns the user to the same page with the drawer open in completion state instead of silently dropping context.
- The completion state provides:
  - success confirmation
  - close action
  - follow-up creation form
  - recurring-task notice when the completion already generated the next instance
- Project-detail guidance explicitly teaches:
  - `Waiting` is for blocked or external-dependency work
  - a done lane is the destination completion uses
  - managers can assign from rows, board cards, or the drawer
- Sign-in explains:
  - default landing in My Tasks
  - task details open in a side drawer
  - invite flows land in the invited workspace
  - first-time admins continue into setup guidance

## Edge Cases
- Invalid `workspace`, `project`, or `status` params must fail safe by falling back to the nearest valid state instead of erroring the page.
- Tasks from a different workspace must never appear in the current My Tasks filter options or result groups.
- `Unassigned` must not accidentally include completed tasks or subtasks.
- `Waiting` quick filtering must not rely on a schema change; renamed statuses stop matching unless they normalize to `waiting`.
- Completing a task with no open drawer context still succeeds and returns the user to the current page without forcing a drawer open.
- Recurring completion keeps the existing next-instance generation behavior and surfaces it only as informational UI.
- Follow-up creation must create a sibling task, not a subtask, and must not require a migration.

## Tests-First Map
- `tests/unit/domain/tasks-queries.test.ts`
  - workspace scoping
  - project/status filters
  - quick filters for waiting, due this week, and unassigned
- `tests/unit/page-loaders/my-tasks-page.test.ts`
  - filter state assembly
  - invalid search-param fallback
  - drawer completion mode wiring
- `tests/unit/components/quick-add-form.test.tsx`
  - assignee and priority fields
  - My Tasks self-default
  - project-detail empty defaults
- `tests/unit/components/task-row.test.tsx`
  - completion form return target
  - assignment affordance wording
- `tests/unit/components/task-drawer-panel.test.tsx`
  - completion mode
  - follow-up form
  - recurring notice
- `tests/unit/components/project-detail-page.test.tsx`
- `tests/unit/page-loaders/project-detail-page.test.ts`
  - updated setup-guide copy and completion drawer state
- `tests/unit/components/workflow-status-manager.test.tsx`
  - clearer lane semantics copy
- `tests/unit/components/signin-page.test.tsx`
  - post-auth journey copy
- `tests/unit/actions/task-actions.test.ts`
  - follow-up creation behavior and activity log
  - completion action recurring notice metadata if added
- `tests/unit/actions/form-actions.test.ts`
  - completion redirect handling
  - follow-up form forwarding

## Out of Scope
- A new database relation for follow-up tasks
- A new modal route or full-page task detail screen
- Project-board quick-add redesign beyond clearer assignment wording
- Authenticated Playwright coverage that depends on seeded workspace/project fixtures
