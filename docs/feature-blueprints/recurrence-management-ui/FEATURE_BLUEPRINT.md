# Recurrence Management UI - FEATURE_BLUEPRINT

<!-- markdownlint-disable MD013 -->

## Pattern Map

| Concern                                | Existing Pattern                                                                 | Source File(s)                                                                                                                                                                      | Reuse Decision                                                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Query-param task drawer context        | Task details stay in context through `?task=<id>` and loader-driven drawer data  | `app/(app)/my-tasks/page.tsx`, `app/(app)/projects/[projectId]/page.tsx`, `lib/page-loaders/task-drawer.ts`, `docs/feature-blueprints/task-home-completion-ux/FEATURE_BLUEPRINT.md` | Reuse the drawer pattern for recurrence management instead of adding a dedicated recurrence screen or modal route |
| Declarative server-action forms        | Simple task mutations submit directly to server actions from task surfaces       | `app/components/tasks/task-drawer-panel.tsx`, `lib/actions/form-actions.ts`, `PATTERNS.md`                                                                                          | Keep recurrence create/edit/pause/resume/remove flows as direct form posts from the drawer                        |
| Server-owned recurrence logic          | Recurrence generation already lives in server actions and a shared domain helper | `lib/actions/task-actions.ts`, `lib/domain/tasks/recurrence.ts`, `tests/unit/recurrence.test.ts`                                                                                    | Extend the existing server-owned recurrence path instead of duplicating cadence logic in the client               |
| Loader-first page assembly             | Authenticated pages consume typed loader results                                 | `lib/page-loaders/my-tasks-page.ts`, `lib/page-loaders/project-detail-page.ts`, `architecture.md`                                                                                   | Extend drawer data contracts in loaders so recurrence state is fully resolved before render                       |
| Task editing stays local to the drawer | The drawer already owns rich task editing without leaving context                | `app/components/tasks/task-drawer-panel.tsx`                                                                                                                                        | Add a dedicated recurrence section inside the existing drawer rather than expanding rows, cards, or Quick Add     |

## Interface

This blueprint defines the lasting MVP contract for recurrence management UI.

### Entry Points

- Recurrence setup and management exists only inside the task drawer on:
  - `/my-tasks`
  - `/projects/[projectId]`
- Recurrence controls do not appear in:
  - task rows
  - board cards
  - Quick Add
  - project-level settings

### Eligibility Rules

- A task can manage recurrence only when all conditions are true:
  - the task is a top-level task (`parent_task_id` is `null`)
  - the task is incomplete (`completed_at` is `null`)
  - the task has a due date
- If a task is ineligible, the drawer shows a disabled recurrence card with the exact blocking reason.
- Clearing the due date of a recurring task is blocked until recurrence is removed.

### Data Contracts

```ts
type RecurrenceFrequency = "daily" | "weekly" | "monthly";

type TaskRecurrencePattern = {
  frequency: RecurrenceFrequency;
  interval: number;
};

type TaskRecurrenceSummary = {
  recurrenceId: string;
  pattern: TaskRecurrencePattern;
  mode: "create_on_complete";
  isPaused: boolean;
  nextDueAtPreview: string | null;
};

type TaskRecurrenceEditorState = {
  canManage: boolean;
  disabledReason: string | null;
  summary: TaskRecurrenceSummary | null;
};
```

### Action Contracts

- `createTaskRecurrenceAction(input: { taskId: string; frequency: RecurrenceFrequency; interval: number })`
- `updateTaskRecurrenceAction(input: { taskId: string; recurrenceId: string; frequency: RecurrenceFrequency; interval: number })`
- `pauseTaskRecurrenceAction(input: { taskId: string; recurrenceId: string })`
- `resumeTaskRecurrenceAction(input: { taskId: string; recurrenceId: string })`
- `clearTaskRecurrenceAction(input: { taskId: string; recurrenceId: string })`

### Persistence Contracts

- Reuse the existing `recurrences` table and `tasks.recurrence_id`.
- New or updated recurrence rows persist:
  - `pattern_json = { frequency, interval }`
  - `mode = 'create_on_complete'`
  - `is_paused = false` on create and resume
  - `next_run_at = null` in MVP
- `clearTaskRecurrenceAction` must:
  - clear the current task's `recurrence_id`
  - set the detached recurrence row to `is_paused = true`
- The UI must not expose `create_on_schedule`, even though the enum already exists in schema.

## Behavior Contracts

- The drawer shows a dedicated `Recurrence` card below the core task edit form.
- Empty state:
  - explains that recurrence creates the next task only after completion
  - shows cadence controls for frequency and interval
  - shows a disabled explanation instead of inputs when the task is ineligible
- Active state:
  - shows cadence summary
  - shows whether the series is active or paused
  - shows a preview of the next due date when one can be computed from the current due date
  - offers `Edit cadence`, `Pause` or `Resume`, and `Remove recurrence`
- Completing a recurring task keeps the current server behavior:
  - mark the current task complete
  - create the next task only when the recurrence is active
  - copy title, description, project, section, assignee, priority, and recurrence linkage
  - move the next task into the first non-done status in the project
  - advance due date from the completed task's due date using the stored pattern
  - reset `is_today` to `false`
- Custom cadence in MVP means an interval greater than `1` within the existing daily, weekly, or monthly frequencies. Day-of-week pickers and cron-like schedules are out of scope.
- Interval validation stays aligned with the current parser contract: integers from `1` through `365`.

## Edge Cases

- A recurring task with a missing or invalid recurrence row must render as non-recurring and surface a safe error message after mutation attempts.
- A task whose recurrence row belongs to a different task must reject pause, resume, update, and clear actions.
- Paused recurrence must not generate a new task on completion.
- Subtasks never show recurrence controls.
- Completed tasks never show recurrence controls even if historical recurrence data exists.
- If a project's statuses no longer contain an open status, completion must fail safely with the existing server error path.
- Removing recurrence must stop future generation without deleting historical task activity.
- Existing completion UI notices for recurring tasks stay informational only; recurrence management does not replace the completion follow-up flow.

## Tests-First Map

- `tests/unit/recurrence.test.ts`
  - interval validation
  - next due date calculation for daily, weekly, and monthly patterns
- `tests/unit/actions/task-actions.test.ts`
  - create, update, pause, resume, and clear recurrence
  - completion with active recurrence
  - completion with paused recurrence
  - task and recurrence mismatch rejection
- `tests/unit/actions/form-actions.test.ts`
  - recurrence form forwarding and redirect handling
- `tests/unit/components/task-drawer-panel.test.tsx`
  - eligible empty state
  - disabled state reasons
  - active summary and pause or resume controls
- `tests/unit/page-loaders/project-detail-page.test.ts`
- `tests/unit/page-loaders/my-tasks-page.test.ts`
  - drawer recurrence editor state wiring on both page surfaces

## Out of Scope

- Quick Add recurrence controls
- Board-card or task-row recurrence controls
- Create-on-schedule UI
- Subtask recurrence
- Day-of-week, day-of-month, or cron-style scheduling
- Bulk recurrence editing across multiple tasks
