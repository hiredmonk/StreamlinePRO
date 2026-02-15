# StreamlinePRO Architecture
_Last updated: 2026-02-15_

## Scope
This document reflects the **current implementation in this repository** and highlights what is still pending for full PRD alignment.

## Tech Stack
- Frontend/App: Next.js 15 (App Router), React 19, TypeScript
- Styling/UI: Tailwind CSS v4 + reusable UI primitives
- Backend platform: Supabase (Auth, Postgres, RLS, Storage)
- Validation: Zod
- Testing: Vitest, Playwright
- CI: GitHub Actions (`.github/workflows/ci.yml`)
- Package manager target: `pnpm`

## System Layers
1. Presentation layer
- Routes in `app/(app)/*`, `app/(auth)/*`
- Reusable components in `app/components/*`
- Task details remain in context via drawer/query-param pattern (`?task=<id>`)

2. Application layer
- Server actions in `lib/actions/*` are the primary mutation interface
- Route handlers in `app/api/*` support HTTP-style access for search/inbox/tasks

3. Domain/query layer
- Read/query and domain logic in `lib/domain/*`
- Recurrence logic in `lib/domain/tasks/recurrence.ts`

4. Data/security layer
- Schema + RLS + indexes in `db/migrations/202602151300_init.sql`
- Supabase clients/middleware in `lib/supabase/*` and `middleware.ts`

## Core Domains
- Workspace and membership
  - `workspaces`, `workspace_members`
- Projects and project-level organization
  - `projects`, `project_members`, `project_sections`, `project_statuses`
- Task management
  - `tasks`, subtasks (`parent_task_id`), comments, attachments, activity
- Notifications and recurrence
  - `notifications`, `recurrences`

## Security Model
- RLS enabled on all business tables
- Workspace membership gates workspace visibility
- Project access supports `workspace_visible` and `private`
- Task and related entities enforce project access/edit checks
- Storage bucket policies exist for task attachments

## Key Flows (Implemented)
1. Auth flow
- Google OAuth sign-in route and callback exist
- Protected app shell validates user session

2. Project/workspace setup
- Workspace creation action + UI
- Project creation action + automatic default statuses/sections

3. Task lifecycle
- Quick Add task
- Inline updates (status/section/due) from list rows
- Complete task action
- Project board drag/drop status movement
- Task drawer for details/subtasks/comments/attachments/activity

4. Recurrence
- On completion, recurring tasks generate next instance (create-next-on-complete path)

5. Notifications
- Notification events created for assignment/comment/mention-like/system cases
- Inbox read + mark-read flow

6. Search
- Global task search screen and `/api/search`
- Results grouped by project in UI

## Interfaces
### Server actions
- Project/workspace: `createWorkspaceAction`, `createProjectAction`
- Tasks: `createTaskAction`, `updateTaskAction`, `moveTaskAction`, `completeTaskAction`, `addCommentAction`, `uploadTaskAttachmentAction`
- Inbox: `markNotificationReadAction`

### Route handlers
- `GET /api/search?q=`
- `GET /api/inbox?unread=1`
- `POST /api/tasks`
- `PATCH /api/tasks`

## Current Coverage
- Asana-style core shell and task/project flows are implemented
- Database schema and RLS baseline are implemented
- Env templates and CI/test scaffolding are present
- Comprehensive unit coverage now exists for implemented server actions, route handlers, domain helpers, validators, and key UI components

## Known Gaps / Pending Work
- Full project/member management UX (invites, role edits, removals)
- Recurrence management UI (create/pause/resume/edit)
- Project templates feature
- Robust mention fan-out and richer notification targeting
- Scheduled jobs for due-soon/overdue notifications and hardened email delivery
- Keyboard shortcut system and command palette
- Type-level cleanup for Supabase generic typing so `pnpm typecheck` can pass
- Full validation in live configured environment (install, migration run, green CI, deployed smoke test)

## Verification Snapshot (2026-02-15)
- `corepack pnpm test` - pass (`39` files, `92` tests)
- `corepack pnpm typecheck` - fail (existing Supabase typing issues)
- `pnpm lint` - not re-run in this pass
- `pnpm test:e2e` - not re-run in this pass

## Operational Dependencies
- Fill `.env.local` with real secrets
- Apply migration on Supabase
- Configure Supabase Google OAuth redirect
- Ensure storage bucket exists and policies are effective
- Deploy app + env vars on hosting provider

## References
- Technical design: `docs/technical-design.md`
- PRD: `PRD/StreamlinePRO.md`
- Migration: `db/migrations/202602151300_init.sql`
