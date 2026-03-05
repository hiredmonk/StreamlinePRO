# Recurrence Management UI - FEATURE_BLUEPRINT

## Pattern Map
| Concern | Existing Pattern | Source File(s) | Reuse Decision |
|---|---|---|---|
| Recurrence domain parsing | Strict frequency/interval parser and next-due calculator | `lib/domain/tasks/recurrence.ts` | Reuse frequency and interval contracts |
| Completion integration | Recurrence drives next task creation on complete | `lib/actions/task-actions.ts` (`completeTaskAction`) | Reuse recurrence identifiers and completion coupling |
| Task form update flow | Task drawer + form actions update task attributes | `app/components/tasks/task-drawer-panel.tsx`, `lib/actions/form-actions.ts` | Reuse for recurrence controls in drawer context |
| Validation conventions | Zod-based schema input guards | `lib/validators/task.ts`, `lib/validators/project.ts` | Reuse for recurrence create/update/pause/resume payloads |
| Data model semantics | `recurrences` table with `pattern_json`, `mode`, `next_run_at`, `is_paused` | `db/migrations/202602151300_init.sql` | Reuse existing table shape; no new table in this blueprint |
| UI context retention | Task detail side-panel pattern (`?task=`) | `app/(app)/my-tasks/page.tsx`, `app/(app)/projects/[projectId]/page.tsx` | Reuse for inline recurrence management without full-page jump |
| Test style | Unit tests for recurrence helpers and actions | `tests/unit/recurrence.test.ts`, `tests/unit/actions/task-actions.test.ts` | Reuse for contract-level scenario coverage |

## Interface (Engineering Drawings)
These interfaces are the engineering drawings for recurrence create/edit/pause/resume management UI.

## Feature List
- Recurrence management UI (create/edit/pause/resume)

### Input Types
```ts
export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';
export type RecurrenceMode = 'create_on_complete' | 'create_on_schedule';

export interface RecurrencePatternInput {
  frequency: RecurrenceFrequency;
  interval: number;
}

export interface CreateRecurrenceInput {
  workspaceId: string;
  taskId: string;
  pattern: RecurrencePatternInput;
  mode: RecurrenceMode;
  anchorDueAt?: string | null;
  actorUserId: string;
}

export interface UpdateRecurrenceInput {
  recurrenceId: string;
  pattern?: RecurrencePatternInput;
  mode?: RecurrenceMode;
  actorUserId: string;
}

export interface PauseRecurrenceInput {
  recurrenceId: string;
  actorUserId: string;
  reason?: string;
}

export interface ResumeRecurrenceInput {
  recurrenceId: string;
  actorUserId: string;
}

export interface ListRecurrencesInput {
  workspaceId: string;
  includePaused?: boolean;
}
```

### Output Types
```ts
export interface RecurrenceSummary {
  id: string;
  workspaceId: string;
  pattern: RecurrencePatternInput;
  mode: RecurrenceMode;
  nextRunAt: string | null;
  isPaused: boolean;
  linkedTaskIds: string[];
}

export interface CreateRecurrenceOutput {
  recurrence: RecurrenceSummary;
}

export interface UpdateRecurrenceOutput {
  recurrence: RecurrenceSummary;
}

export interface PauseRecurrenceOutput {
  recurrenceId: string;
  isPaused: true;
  pausedAt: string;
}

export interface ResumeRecurrenceOutput {
  recurrenceId: string;
  isPaused: false;
  resumedAt: string;
}

export interface ListRecurrencesOutput {
  recurrences: RecurrenceSummary[];
}
```

### Function Signatures
```ts
export type CreateRecurrenceAction = (
  input: CreateRecurrenceInput
) => Promise<ActionResult<CreateRecurrenceOutput>>;

export type UpdateRecurrenceAction = (
  input: UpdateRecurrenceInput
) => Promise<ActionResult<UpdateRecurrenceOutput>>;

export type PauseRecurrenceAction = (
  input: PauseRecurrenceInput
) => Promise<ActionResult<PauseRecurrenceOutput>>;

export type ResumeRecurrenceAction = (
  input: ResumeRecurrenceInput
) => Promise<ActionResult<ResumeRecurrenceOutput>>;

export type ListRecurrencesQuery = (
  input: ListRecurrencesInput
) => Promise<ListRecurrencesOutput>;
```

## Edge Cases
- Interval less than 1 or greater than supported maximum.
- Monthly recurrence anchored on dates that do not exist every month (e.g., 31st).
- Pause/resume operations racing across multiple clients.
- Recurrence references deleted task or inaccessible workspace.
- Resume called on already-active recurrence.
- Mode change from `create_on_complete` to `create_on_schedule` with null `nextRunAt`.

## Out of Scope (No Logic Yet)
- Cron/scheduler execution logic.
- UI widget rendering for recurrence controls.
- Data migration or backfill of existing recurrence rows.
