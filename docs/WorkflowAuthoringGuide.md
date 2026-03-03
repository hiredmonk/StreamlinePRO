# Workflow Authoring Guide

## Purpose
This guide explains how to add or change:
- Product workflows (project status lanes used by task list and board views)
- GitHub Actions workflows (`.github/workflows/*.yml`)

Use this as the single checklist before introducing a new workflow path.

## Product Workflow (Status Lanes)

### Data model and semantics
- Source of truth: `project_statuses`
- Each status belongs to one project and has:
  - `name` (unique per project, case-insensitive)
  - `color` (hex `#RRGGBB`)
  - `sort_order` (board/list order)
  - `is_done` (completion lane marker)
- Invariants:
  - A project must always have at least one status.
  - A project must always keep at least one `is_done = true` status.

### Server actions
- Add lane: `createProjectStatusAction`
- Edit lane: `updateProjectStatusAction`
- Reorder lanes: `reorderProjectStatusesAction`
- Delete lane with fallback reassignment: `deleteProjectStatusAction`

All mutations revalidate:
- `/projects`
- `/projects/[projectId]`
- `/my-tasks`

### UI flow
- Workflow settings live on project detail page.
- New status can be created with lane name, color, and optional done flag.
- Existing statuses support:
  - Rename
  - Color update
  - Done flag toggle
  - Up/down ordering
  - Deletion with required fallback lane (tasks are moved first)

### Safety checks to keep
- Reject duplicate status names in same project.
- Reject done-flag updates that would leave no done statuses.
- Reject delete if fallback is outside the same project.
- Reject reorder payload if IDs are missing, duplicated, or foreign.

## GitHub Actions Workflow Authoring

### Existing workflows
- CI: `.github/workflows/ci.yml`
- Production deploy: `.github/workflows/deploy.yml`

### Minimum checklist for a new workflow
1. Keep workflow name and file name specific to purpose.
2. Use explicit `on:` triggers and branch filters.
3. Use pinned major versions for actions.
4. Install dependencies with lockfile enforcement.
5. Add guardrails for secret presence if deployment/integration actions are involved.
6. Keep destructive operations behind explicit conditions.
7. Ensure production paths only trigger from validated branches/events.

### Trigger and dependency pattern
- Prefer direct `push`/`pull_request` for test-only workflows.
- For deploy workflows that depend on CI, use `workflow_run` with:
  - `conclusion == 'success'`
  - matching source event (`push`)
  - branch constraint (`main`)

### Required validation before merge
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- Confirm workflow does not accidentally trigger production deploy from PR events.
