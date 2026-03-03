# Board Concurrent Ordering - FEATURE_BLUEPRINT

## Pattern Map
| Concern | Existing Pattern | Source File(s) | Reuse Decision |
|---|---|---|---|
| Board drag/drop flow | Client-side optimistic move then server action call | `app/components/projects/board-view.tsx` | Reuse optimistic UI contract with rollback-capable outputs |
| Task move mutation | `moveTaskAction` updates `status_id`, `section_id`, `sort_order` | `lib/actions/task-actions.ts` | Extend via interface only with concurrency metadata |
| Task ordering persistence | `sort_order` currently numeric and mutable | `lib/domain/tasks/queries.ts`, `app/api/tasks/route.ts` | Preserve `sort_order` as canonical lane order field |
| Validation conventions | Zod schemas + explicit duplicate/invalid payload checks | `lib/validators/project.ts` | Reuse for reorder payload integrity and lane ownership checks |
| Workflow ordering invariants | IDs must be complete, non-duplicate, and project-scoped | `docs/WorkflowAuthoringGuide.md` | Apply same invariant language to task ordering contracts |
| Error propagation style | Action returns `{ ok: false, error }` and client reverts optimistic state | `lib/actions/types.ts`, `app/components/projects/board-view.tsx` | Reuse to surface conflict-safe failure outcomes |
| Test style for move behavior | RTL interaction + action-call assertions | `tests/unit/components/board-view.test.tsx`, `tests/unit/actions/task-actions.test.ts` | Reuse for concurrent reordering tests |

## Interface (Engineering Drawings)
These interfaces are the engineering drawings for robust task ordering under concurrent board edits.

## Feature List
- Robust concurrent ordering strategy for board movement

### Input Types
```ts
export interface BoardOrderVersion {
  projectId: string;
  statusId: string;
  version: number;
}

export interface MoveTaskWithConcurrencyInput {
  taskId: string;
  projectId: string;
  fromStatusId: string;
  toStatusId: string;
  toSectionId?: string | null;
  targetIndex: number;
  expectedLaneVersion: number;
  actorUserId: string;
}

export interface ReorderBoardColumnInput {
  projectId: string;
  statusId: string;
  orderedTaskIds: string[];
  expectedLaneVersion: number;
  actorUserId: string;
}

export interface FetchBoardOrderStateInput {
  projectId: string;
  statusId?: string;
}
```

### Output Types
```ts
export interface BoardConflictInfo {
  projectId: string;
  statusId: string;
  expectedVersion: number;
  actualVersion: number;
  reason: 'version_mismatch' | 'duplicate_sort_order' | 'missing_task' | 'invalid_lane';
}

export interface MoveTaskWithConcurrencyOutput {
  taskId: string;
  projectId: string;
  statusId: string;
  sectionId: string | null;
  sortOrder: number;
  laneVersion: number;
  conflict?: BoardConflictInfo;
}

export interface ReorderBoardColumnOutput {
  projectId: string;
  statusId: string;
  laneVersion: number;
  updatedTaskIds: string[];
  conflict?: BoardConflictInfo;
}

export interface BoardOrderState {
  projectId: string;
  statusId: string;
  laneVersion: number;
  orderedTaskIds: string[];
}

export interface FetchBoardOrderStateOutput {
  lanes: BoardOrderState[];
}
```

### Function Signatures
```ts
export type MoveTaskWithConcurrencyAction = (
  input: MoveTaskWithConcurrencyInput
) => Promise<ActionResult<MoveTaskWithConcurrencyOutput>>;

export type ReorderBoardColumnAction = (
  input: ReorderBoardColumnInput
) => Promise<ActionResult<ReorderBoardColumnOutput>>;

export type FetchBoardOrderStateQuery = (
  input: FetchBoardOrderStateInput
) => Promise<FetchBoardOrderStateOutput>;
```

## Edge Cases
- Two users move the same task into different columns at near-identical times.
- Two users reorder the same lane with stale `expectedLaneVersion` values.
- Payload contains duplicate task ids or omits an existing task from lane ordering.
- Target lane has been deleted or renamed between fetch and mutation.
- `targetIndex` is out of bounds for current lane size.
- Optimistic update succeeds locally but server rejects due to version conflict.

## Out of Scope (No Logic Yet)
- Database migration for version counters.
- Rebalancing/reindexing algorithm for `sort_order` gaps.
- UI drag/drop implementation changes.
