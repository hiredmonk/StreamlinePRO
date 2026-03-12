# StreamlinePRO Todo
_Last updated: 2026-03-12_

Status rule used here: **checked = implemented in repository code**. Unchecked items are pending, partial, or environment-validated work.
Priority tags used here: **P0 = launch-critical**, **P1 = next milestone / core adoption**, **P2 = polish / follow-on usability**.

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
- [x] [P0] Member invite/remove/role-management UX completed in the admin-only Team access panel on `/projects?workspace=<id>`
- [ ] [P1] Workspace onboarding checklist guides first-time admin from workspace creation to first project
- [x] [P0] Pending invites and member directory UI implemented for workspace admins (create + cancel only; resend deferred)
- [ ] [P1] Project membership management UX completed for private projects
- [ ] [P2] Projects listing shows member counts alongside task and overdue counts

Scope note for the P0 member-management slice:
- Google-first invite acceptance with app-sent invite emails
- No resend action in P0; cancel + recreate is sufficient
- Removing a member must unassign their incomplete tasks and remove their `project_members` rows in that workspace

## 4) Tasks Core
- [x] Quick Add task flow implemented
- [x] My Tasks view (Today/Upcoming/Overdue) implemented
- [x] Task list row inline updates (status/section/due) implemented
- [x] Task complete action implemented
- [x] Task drawer with details, subtasks, and comments implemented
- [x] Task activity log display implemented
- [x] [P0] Assignee display/edit UX implemented in task row, task drawer, and project board cards
- [ ] [P1] My Tasks filters by project and status implemented
- [ ] [P1] One-click task filters implemented for Waiting, due this week, and unassigned work
- [ ] [P1] Quick Add flow supports contextual assignee/priority defaults without forcing users into the drawer
- [ ] [P1] Follow-up task creation flow implemented from task drawer and task completion path
- [ ] [P2] Keyboard shortcut system implemented
- [ ] [P2] Command palette (`Ctrl/Cmd + K`) implemented

Scope note for the P0 assignee slice:
- `workspace_visible` projects can assign any workspace member
- `private` projects can assign only current project members
- Private-project membership management UI remains out of scope for this P0

## 5) Board
- [x] Project board view implemented
- [x] Drag/drop status movement implemented with optimistic client update
- [ ] [P1] Quick add card per board column implemented
- [ ] [P1] Board cards show assignee, due date, and comment/follow-up signals at a glance
- [ ] [P1] Robust concurrent ordering strategy finalized

## 6) Recurrence & Templates
- [x] Recurrence create-next-on-complete logic implemented
- [ ] [P1] Recurrence management UI (create/edit/pause/resume) implemented
- [ ] [P1] Project templates feature implemented
- [ ] [P2] First-workflow setup path supports starting from a template or default workflow recipe

## 7) Notifications
- [x] Notification data model and write events implemented
- [x] Inbox page and mark-read flow implemented
- [x] Due-soon/overdue scheduled generation jobs implemented
- [x] Production-grade email notification delivery implemented and verified
- [x] Full @mention fan-out (all mentioned users) implemented
- [ ] [P2] Inbox quick actions expanded for open in context, mark read, and snooze/dismiss decisions

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
- [ ] [P1] Search performance benchmark (<1s target) validated with realistic data volume

## 10) Database & Security
- [x] Initial schema migration created
- [x] RLS policies and helper authorization SQL functions created
- [x] Indexes added (including trigram for title search)
- [x] Migration applied to target Supabase project
- [ ] [P0] Multi-user RLS behavior validated via integration scenarios

## 11) Environment & Deployment
- [x] `.env.local.example` created
- [x] `.env.local` placeholder template created
- [x] Real secrets populated locally
- [x] Hosting platform/server runtime env vars configured with real values
- [ ] [P0] Deployment smoke test completed

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
- [ ] [P1] Sign-in page explains what happens after Google auth and what first-time users should do next
- [ ] [P1] Empty states guide users from no workspace -> first workspace -> first project -> first task
- [ ] [P1] Post-workspace creation flow offers the next obvious action: invite team or create first project
- [ ] [P1] Post-project creation flow offers the next obvious action: refine statuses and add first tasks
- [ ] [P1] Workflow setup UI explains statuses, done lanes, and when teams should use Waiting vs Doing
- [ ] [P1] Task assignment flow is obvious enough for managers to assign work without opening multiple screens
- [ ] [P1] Task detail view makes subtasks, comments, attachments, and follow-up actions feel like one workflow instead of separate forms
- [ ] [P1] Task completion flow supports closing the loop: mark done, capture outcome, and create follow-up when useful
- [ ] [P2] Success/error feedback is standardized across all forms with clear inline validation and non-blocking confirmations

## 14) PRD Acceptance Closure
- [ ] [P0] Full PRD acceptance walkthrough completed against `PRD/StreamlinePRO.md`
- [ ] [P1] Remaining gaps prioritized into next milestone/sprint plan

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
  - Suggested manual test steps:
  - Create at least two real users in the same workspace and one user outside the workspace.
  - Validate `workspace_visible` project access: same-workspace users can see/update allowed records, outside user cannot.
  - Validate `private` project access: only project members can see tasks, assign tasks, comment, and upload attachments.
  - Remove one workspace member from Team access and verify incomplete tasks become unassigned and project membership rows are gone.
  - Attempt invite acceptance with the wrong Google account and confirm the app returns to sign-in with the invite mismatch error.
- [ ] Deployment smoke test completed
  - Suggested manual test steps:
  - Open the deployed app and confirm `/signin`, `/projects`, `/my-tasks`, one project detail page, and board view all render without runtime errors.
  - Create a task, reassign it, move it across statuses, open the drawer, add a comment, and upload an attachment.
  - From Team access, create an invite, cancel an invite, and change a member role in a non-last-admin scenario.
  - Trigger one email/inbox-producing path and verify production links and visible notifications look correct.
  - Confirm no unexpected redirects, 500s, or console-visible breakage during the flow.
- [ ] Full PRD acceptance walkthrough completed against `PRD/StreamlinePRO.md`
  - Suggested manual test steps:
  - Walk section by section through `PRD/StreamlinePRO.md` using the deployed app and this Todo list together.
  - Mark each PRD requirement as pass, fail, or follow-up; capture exact screens/flows for any mismatch.
  - Confirm the shipped P0 slices cover member management, pending invites, assignee UX, and assignment eligibility rules.
  - Roll any accepted gaps into the next milestone list instead of silently leaving them ambiguous.
- [ ] Remaining gaps prioritized into next milestone/sprint plan
  - You need to provide prioritization decisions (business priority, timeline, and scope tradeoffs).
