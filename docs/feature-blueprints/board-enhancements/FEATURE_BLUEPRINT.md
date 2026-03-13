# Board Enhancements - FEATURE_BLUEPRINT

## Pattern Map
| Concern | Existing Pattern | Source File(s) | Reuse Decision |
|---|---|---|---|
| Thin authenticated page assembly | Project detail routes stay server-rendered and pass view-ready data into presentational components | `app/(app)/projects/[projectId]/page.tsx`, `lib/page-loaders/project-detail-page.ts` | Keep the project page loader thin and implement the board enhancements inside the board surface plus shared helpers |
| Client-owned board behavior | Drag/drop state and optimistic lane updates live in a dedicated behavior hook | `app/components/projects/board-view.tsx`, `lib/hooks/use-board-tasks.ts`, `PATTERNS.md` | Extend the existing board hook for optimistic append ordering and keep the board component responsible for local quick-add draft state |
| Direct server-action mutations | Simple task mutations are invoked directly instead of adding extra API wrappers or form hooks | `lib/actions/task-actions.ts`, `lib/actions/form-actions.ts`, `app/components/tasks/quick-add-form.tsx` | Reuse direct task actions for inline lane quick add and assignee updates |
| Presenter-style task metadata | Pure helpers derive display metadata from `TaskWithRelations` without React state | `lib/view-models/task-row.ts`, `app/components/tasks/task-row.tsx` | Add a board-card presenter helper for due and risk signals instead of embedding that logic in JSX |
| Server-authoritative append ordering | Persisted ranks are assigned on the server for append-only board flows | `PATTERNS.md`, `lib/actions/task-actions.ts`, `app/api/tasks/route.ts` | Standardize a shared task sort-order allocator across all task create and move entrypoints |

## Interface

### UI Contract
- Each board column renders:
  - the lane header and count
  - existing draggable cards
  - a lightweight `Add card` control that expands into an inline title-only composer
- The inline composer:
  - auto-focuses when opened
  - submits on `Enter`
  - cancels on `Escape` or explicit cancel click
  - creates the new task directly in that column's status
- Board cards show:
  - title
  - section label when present
  - assignee state and inline reassignment control
  - due label plus relative due text when a due date exists
  - compact risk signals for overdue, waiting, and priority

### Mutation Contract
- `createTaskAction` keeps the existing input shape, but board-column quick add calls it with only:
  - `projectId`
  - `statusId`
  - `title`
- `moveTaskAction` becomes append-oriented:
  - input: `id`, `statusId`, optional `sectionId`
  - output: `taskId`, canonical `sortOrder`
- Insert flows rely on the database default `tasks.sort_order`.
- Move flows allocate the next persisted rank through a shared server helper or RPC instead of a caller-supplied order.

## Behavior Contracts
- Column quick add does not expose assignee, due date, priority, or section controls.
- Quick add inherits existing task defaults:
  - assignee defaults to the actor when allowed by project privacy, otherwise `null`
  - section defaults to the first section when omitted
  - due date and priority remain empty
- Board drag/drop remains append-only:
  - dropping into another lane places the card at that lane's bottom
  - dropping back into the same lane moves the card to that lane's bottom
- Board cards do not add comment counts in this pass.

## Edge Cases
- Empty lanes must still expose the inline composer and preserve the existing drop target affordance.
- Quick-add failures must keep the typed title so the user can retry.
- Concurrent board moves, API inserts, and recurring-task creation must not persist duplicate `sort_order` values derived from stale client counts.
- `Waiting` detection remains name-based and should tolerate case and whitespace differences.
- Cards with no due date must render a stable fallback label instead of blank space.
- Assignee edits keep the current rollback behavior if the mutation fails.

## Tests-First Map
- `tests/unit/components/board-view.test.tsx`
- `tests/unit/hooks/use-board-tasks.test.tsx`
- `tests/unit/view-models/task-card.test.ts`
- `tests/unit/actions/task-actions.test.ts`
- `tests/unit/actions/form-actions.test.ts`
- `tests/unit/api/tasks-route.test.ts`

## Out of Scope
- True within-column manual reordering
- Board comment-count aggregation
- A full board-specific E2E harness
