# StreamlinePRO Todo
_Last updated: 2026-02-15_

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
- [ ] Supabase Google provider configured and verified in target project
- [ ] End-to-end OAuth callback flow validated in deployed environment

## 3) Workspace & Projects
- [x] Workspace creation flow implemented
- [x] Project creation flow implemented
- [x] Default statuses and sections auto-created on project creation
- [x] Projects listing view with task and overdue counts
- [ ] Member invite/remove/role-management UX completed

## 4) Tasks Core
- [x] Quick Add task flow implemented
- [x] My Tasks view (Today/Upcoming/Overdue) implemented
- [x] Task list row inline updates (status/section/due) implemented
- [x] Task complete action implemented
- [x] Task drawer with details, subtasks, and comments implemented
- [x] Task activity log display implemented
- [ ] Keyboard shortcut system implemented
- [ ] Command palette (`Ctrl/Cmd + K`) implemented

## 5) Board
- [x] Project board view implemented
- [x] Drag/drop status movement implemented with optimistic client update
- [ ] Robust concurrent ordering strategy finalized

## 6) Recurrence & Templates
- [x] Recurrence create-next-on-complete logic implemented
- [ ] Recurrence management UI (create/edit/pause/resume) implemented
- [ ] Project templates feature implemented

## 7) Notifications
- [x] Notification data model and write events implemented
- [x] Inbox page and mark-read flow implemented
- [ ] Due-soon/overdue scheduled generation jobs implemented
- [ ] Production-grade email notification delivery implemented and verified
- [ ] Full @mention fan-out (all mentioned users) implemented

## 8) Attachments
- [x] Attachment upload action implemented
- [x] Attachment metadata persistence implemented
- [x] Attachment listing and signed URL access in drawer implemented
- [x] Storage bucket policy definitions added in migration
- [ ] Storage policies validated in target Supabase environment

## 9) Search
- [x] Global task search UI implemented
- [x] `/api/search` endpoint implemented
- [x] Search results grouped by project in UI
- [ ] Search performance benchmark (<1s target) validated with realistic data volume

## 10) Database & Security
- [x] Initial schema migration created
- [x] RLS policies and helper authorization SQL functions created
- [x] Indexes added (including trigram for title search)
- [ ] Migration applied to target Supabase project
- [ ] Multi-user RLS behavior validated via integration scenarios

## 11) Environment & Deployment
- [x] `.env.local.example` created
- [x] `.env.local` placeholder template created
- [ ] Real secrets populated locally
- [ ] Hosting platform env vars configured
- [ ] Deployment smoke test completed

## 12) Quality Gates
- [x] Unit tests for recurrence/date helpers added
- [x] Integration test scaffold added
- [x] E2E sign-in smoke test added
- [x] Comprehensive unit tests added for implemented server actions, route handlers, domain helpers, validators, and key UI components
- [x] Vitest config aligned with repo alias and unit scope (exclude e2e, automatic JSX runtime)
- [ ] `pnpm typecheck` passes in network-enabled environment
- [ ] `pnpm lint` passes in network-enabled environment
- [x] `pnpm test` passes in network-enabled environment
- [ ] `pnpm test:e2e` passes in network-enabled environment

### Verification Notes (2026-02-15)
- `corepack pnpm test` - pass (`39` test files, `92` tests)
- `corepack pnpm typecheck` - fail (existing Supabase typing issues; remediation pending)

## 13) PRD Acceptance Closure
- [ ] Full PRD acceptance walkthrough completed against `PRD/StreamlinePRO.md`
- [ ] Remaining gaps prioritized into next milestone/sprint plan
