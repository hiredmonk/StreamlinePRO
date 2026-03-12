# StreamlinePRO Todo
_Last updated: 2026-03-12_

Status rule used here: **checked = implemented in repository code**. Unchecked items are pending, partial, or environment-validated work.

## 1) Foundation
- [x] Next.js + TypeScript scaffold created
- [x] Tailwind + global app shell styling created
- [x] GitHub Actions workflow added
- [x] Unit, integration, and E2E test scaffolds added
- [x] Dependency installation and full local test run completed in network-enabled environment

## 2) Auth & Session
- [x] Supabase browser/server client wiring added
- [x] Session middleware added
- [x] Google OAuth route + callback added
- [x] Sign-in page and sign-out flow added
- [x] Supabase Google provider configured and verified in target project
- [x] Deployed runtime env uses real Supabase project values (not placeholders)
- [x] End-to-end OAuth callback flow validated in deployed environment

## 3) Workspace & Projects
- [x] Workspace creation flow implemented
- [x] Project creation flow implemented
- [x] Default statuses and sections auto-created on project creation
- [x] Projects listing view with task and overdue counts
- [ ] Member invite/remove/role-management UX completed
- [ ] Workspace onboarding checklist guides first-time admin from workspace creation to first project
- [ ] Pending invites and member directory UI implemented for workspace admins
- [ ] Project membership management UX completed for private projects
- [ ] Projects listing shows member counts alongside task and overdue counts

## 4) Tasks Core
- [x] Quick Add task flow implemented
- [x] My Tasks view (Today/Upcoming/Overdue) implemented
- [x] Task list row inline updates (status/section/due) implemented
- [x] Task complete action implemented
- [x] Task drawer with details, subtasks, and comments implemented
- [x] Task activity log display implemented
- [ ] Assignee display/edit UX implemented in task row, task drawer, and project board cards
- [ ] My Tasks filters by project and status implemented
- [ ] One-click task filters implemented for Waiting, due this week, and unassigned work
- [ ] Quick Add flow supports contextual assignee/priority defaults without forcing users into the drawer
- [ ] Follow-up task creation flow implemented from task drawer and task completion path
- [ ] Keyboard shortcut system implemented
- [ ] Command palette (`Ctrl/Cmd + K`) implemented

## 5) Board
- [x] Project board view implemented
- [x] Drag/drop status movement implemented with optimistic client update
- [ ] Quick add card per board column implemented
- [ ] Board cards show assignee, due date, and comment/follow-up signals at a glance
- [ ] Robust concurrent ordering strategy finalized

## 6) Recurrence & Templates
- [x] Recurrence create-next-on-complete logic implemented
- [ ] Recurrence management UI (create/edit/pause/resume) implemented
- [ ] Project templates feature implemented
- [ ] First-workflow setup path supports starting from a template or default workflow recipe

## 7) Notifications
- [x] Notification data model and write events implemented
- [x] Inbox page and mark-read flow implemented
- [x] Due-soon/overdue scheduled generation jobs implemented
- [x] Production-grade email notification delivery implemented and verified
- [x] Full @mention fan-out (all mentioned users) implemented
- [ ] Inbox quick actions expanded for open in context, mark read, and snooze/dismiss decisions

## 8) Attachments
- [x] Attachment upload action implemented
- [x] Attachment metadata persistence implemented
- [x] Attachment listing and signed URL access in drawer implemented
- [x] Storage bucket policy definitions added in migration
- [x] Storage policies validated in target Supabase environment

## 9) Search
- [x] Global task search UI implemented
- [x] `/api/search` endpoint implemented
- [x] Search results grouped by project in UI
- [ ] Search performance benchmark (<1s target) validated with realistic data volume

## 10) Database & Security
- [x] Initial schema migration created
- [x] RLS policies and helper authorization SQL functions created
- [x] Indexes added (including trigram for title search)
- [x] Migration applied to target Supabase project
- [ ] Multi-user RLS behavior validated via integration scenarios

## 11) Environment & Deployment
- [x] `.env.local.example` created
- [x] `.env.local` placeholder template created
- [x] Real secrets populated locally
- [x] Hosting platform/server runtime env vars configured with real values
- [ ] Deployment smoke test completed

## 12) Quality Gates
- [x] Unit tests for recurrence/date helpers added
- [x] Integration test scaffold added
- [x] E2E sign-in smoke test added
- [x] Comprehensive unit tests added for implemented server actions, route handlers, domain helpers, validators, and key UI components
- [x] Vitest config aligned with repo alias and unit scope (exclude e2e, automatic JSX runtime)
- [x] `pnpm typecheck` passes in network-enabled environment
- [x] `pnpm lint` passes in network-enabled environment
- [x] `pnpm test` passes in network-enabled environment
- [x] `pnpm test:e2e` passes in network-enabled environment

### Verification Notes (2026-02-16)
- `corepack pnpm test` - pass (`41` test files, `100` tests)
- `corepack pnpm typecheck` - pass
- `corepack pnpm lint` - pass (`next lint`, no ESLint errors)
- `corepack pnpm test:e2e` - pass (`1` Playwright test, Chromium)
- MCP `list_migrations` confirms applied migration version `20260215164119` (`202602151620_reconcile_prod_schema`)
- MCP SQL check confirms `storage.objects` attachment policies exist: `attachments_bucket_select`, `attachments_bucket_insert`, `attachments_bucket_delete`
- `addCommentAction` mention fan-out implemented and validated by unit tests (`tests/unit/actions/task-actions.test.ts`)
- Due notification scheduler implemented (`lib/domain/inbox/scheduler.ts`) with protected job endpoint (`app/api/jobs/due-notifications/route.ts`) and unit coverage
- Deployed OAuth start verified: `https://streamlinepro.online/auth/google` returns `307` to real Supabase project (`hdairxfxelyulwfjndox`) and `redirect_to=https://streamlinepro.online/auth/callback`
- Deployed callback probe now returns `307` to `https://streamlinepro.online/signin` (validated after `Deploy Production` run `22047623028` on 2026-02-16)
- Auth redirect hardening added in `app/auth/callback/route.ts` and `app/auth/google/route.ts` with regression test coverage (`tests/unit/api/auth-routes.test.ts`)
- Human E2E sign-in validation confirmed on deployed app (Google auth success + post-login persistence) on 2026-02-16
- Local real-secret startup validation passed: `COREPACK_HOME="$PWD/.corepack" corepack pnpm dev` booted cleanly and `/auth/callback` + `/auth/google` returned expected `307` responses on 2026-02-16
- Production runtime env audit passed on 2026-02-16: active file `/home/ubuntu/streamlinepro/.env.local`, required keys set/non-placeholder, `/auth/google` and `/auth/callback` redirects verified
- Production email notifications verified on 2026-03-05: sender `support@streamlinepro.online`, production links use `https://streamlinepro.online`, endpoint `POST /api/jobs/email-notifications` returns successful summary, and scheduled workflow `Email Notification Dispatch` executed successfully.

## 13) UX Journey & Adoption
- [ ] Sign-in page explains what happens after Google auth and what first-time users should do next
- [ ] Empty states guide users from no workspace -> first workspace -> first project -> first task
- [ ] Post-workspace creation flow offers the next obvious action: invite team or create first project
- [ ] Post-project creation flow offers the next obvious action: refine statuses and add first tasks
- [ ] Workflow setup UI explains statuses, done lanes, and when teams should use Waiting vs Doing
- [ ] Task assignment flow is obvious enough for managers to assign work without opening multiple screens
- [ ] Task detail view makes subtasks, comments, attachments, and follow-up actions feel like one workflow instead of separate forms
- [ ] Task completion flow supports closing the loop: mark done, capture outcome, and create follow-up when needed
- [ ] Success/error feedback is standardized across all forms with clear inline validation and non-blocking confirmations

## 14) PRD Acceptance Closure
- [ ] Full PRD acceptance walkthrough completed against `PRD/StreamlinePRO.md`
- [ ] Remaining gaps prioritized into next milestone/sprint plan

## Owner / Human Action Required
These are pending items that require your access, credentials, or product decisions before I can close them:

- Runbook for one-by-one execution: `StreamlinePRO/HumanActionClosureRunbook.md`
- Supporting benchmark profile: `StreamlinePRO/SearchBenchmarkProfile.md`
- Supporting RLS matrix: `StreamlinePRO/RLSValidationMatrix.md`
- [x] Production-grade email notification delivery implemented and verified
  - Completed on 2026-03-05 (Resend domain verified, production credentials configured, dispatch endpoint + scheduled workflow validated).
- [ ] Search performance benchmark (<1s target) validated with realistic data volume
  - Baseline profile is defined in `StreamlinePRO/SearchBenchmarkProfile.md`; you need to approve it (or adjust it) and run the benchmark on realistic data.
- [ ] Multi-user RLS behavior validated via integration scenarios
  - Execution matrix is defined in `StreamlinePRO/RLSValidationMatrix.md`; you need to run it with real users and record pass/fail.
- [ ] Deployment smoke test completed
  - You need to provide target deployment endpoint/environment access and confirm smoke-test checklist scope.
- [ ] Full PRD acceptance walkthrough completed against `PRD/StreamlinePRO.md`
  - You need to approve product-level acceptance decisions for each PRD requirement.
- [ ] Remaining gaps prioritized into next milestone/sprint plan
  - You need to provide prioritization decisions (business priority, timeline, and scope tradeoffs).
