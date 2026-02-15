# StreamlinePRO Technical Design (MVP+)

## 1. Objective
StreamlinePRO is an Asana-style web application optimized for fast task operations, clear accountability, and repeating workflows. This architecture supports:

- Inline and low-friction task updates
- My Tasks as the default home view
- Project list + board in one system of record
- Recurrence, comments/mentions, attachments, and inbox notifications
- Secure multi-workspace access with Supabase RLS

## 2. Stack
- App: Next.js 15.5 App Router, React 19, TypeScript 5
- UI: Tailwind CSS v4, custom design primitives
- Auth + DB + Realtime + Storage: Supabase
- Validation: Zod
- Testing: Vitest + Playwright
- CI: GitHub Actions
- Package manager: pnpm
- Deployment target: Vercel (app) + Supabase project

## 3. Architecture

### 3.1 Layers
1. Presentation layer (`app/*`, `app/components/*`)
- Server components for data-rich screens
- Client components only where needed (board drag/drop)
- Drawer-based detail context through query params (`?task=<id>`)

2. Application layer (`lib/actions/*`)
- Server actions as default mutation entrypoint
- Route handlers (`app/api/*`) for explicit HTTP access
- Input validation by Zod before persistence

3. Domain/query layer (`lib/domain/*`)
- Project, task, inbox query abstractions
- Recurrence logic isolated in reusable domain helper

4. Data/security layer (`db/migrations/*`)
- Postgres schema + indexes
- RLS policies for workspace/project/task boundaries
- Authorization helper SQL functions reused by policies

### 3.2 Key user flows
1. Quick Add task
- User submits title + project (+ optional due)
- Server action resolves default status/section
- Task created with optimistic sort order and creator metadata
- Assignment notification generated if assignee differs from actor

2. Complete recurring task
- Task marked completed with done status
- Recurrence pattern loaded
- Next instance generated using date arithmetic
- Activity log persisted

3. Task mention/comment
- Comment stored on task
- Mention/comment notification generated for primary target user
- Inbox reflects update

## 4. Data model summary
Core tables:
- `workspaces`, `workspace_members`
- `projects`, `project_members`, `project_sections`, `project_statuses`
- `tasks`, `task_comments`, `task_attachments`, `task_activity`
- `notifications`
- `recurrences`

Important modeling choices:
- Board supports **both** status and section dimensions
- Due dates are `timestamptz` with optional `due_timezone`
- Recurrence uses flexible `pattern_json`
- Notification schema supports both in-app and email channels

## 5. Security model
RLS is enabled for all business tables.

Core rules:
- Workspace data is visible only to workspace members
- Project visibility:
  - `workspace_visible`: any workspace member can read
  - `private`: only project members can read
- Task mutation requires project edit access
- Notifications are readable/updatable only by recipient user
- Storage access policy scopes attachment access by workspace path prefix

## 6. Interface contracts

### 6.1 Server actions
- `createWorkspaceAction`
- `createProjectAction`
- `createTaskAction`
- `updateTaskAction`
- `moveTaskAction`
- `completeTaskAction`
- `addCommentAction`
- `markNotificationReadAction`

### 6.2 Route handlers
- `GET /api/search?q=`
- `GET /api/inbox?unread=1`
- `POST /api/tasks`
- `PATCH /api/tasks`

## 7. Performance and UX decisions
- Optimistic board movement in client state before mutation result
- Single-query grouped fetches for statuses/sections by project list
- Drawer context avoids full-page transitions
- Database indexes support due-date queries, assignee queries, and title search

## 8. Testing strategy
- Unit: domain utilities (recurrence, formatting)
- Integration: route handlers and validation boundaries
- E2E: sign-in page and top-level route smoke test
- CI gates: typecheck + lint + unit tests on PR

## 9. Environment + secrets
Local `.env.local` holds all required keys with placeholders. Real secrets remain local or in deployment secret manager.

Required groups:
- App URL/timezone
- Supabase URL/anon/service role/JWT
- Google OAuth
- Storage bucket
- Email provider
- Optional observability/logging

## 10. Initial rollout sequence
1. Apply migration in Supabase project
2. Configure Auth providers and redirect URLs
3. Configure storage bucket and verify object policies
4. Fill `.env.local` and run app locally
5. Seed first workspace/project and verify role boundaries
6. Enable CI and deploy preview to Vercel
