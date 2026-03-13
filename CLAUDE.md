# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev          # Start dev server on port 3000
pnpm build        # Production build
pnpm lint         # ESLint
pnpm typecheck    # tsc --noEmit (currently has known Supabase typing failures)
pnpm test         # Vitest unit tests
pnpm test:watch   # Vitest in watch mode
pnpm test:e2e     # Playwright E2E tests
```

Run a single test file:
```bash
pnpm test tests/unit/actions/task-actions.test.ts
```

Use `pnpm` (v10.5.2+). Do not use npm or yarn.

## Architecture

**StreamlinePRO** is an Asana-style project management SaaS. Stack: Next.js 15 App Router, React 19, TypeScript, Supabase (Postgres + Auth + Storage), TanStack Query v5, Tailwind CSS v4, Zod v4, Vitest, Playwright.

### Layer breakdown

| Layer | Location | Purpose |
|---|---|---|
| Pages / UI | `app/(app)/` | Protected routes. Server components for data-heavy views, client components for interactive UI. |
| Auth routes | `app/(auth)/signin/` | Google OAuth flow. |
| API routes | `app/api/` | HTTP endpoints (search, inbox, background jobs). |
| Server Actions | `lib/actions/` | **Primary mutation interface.** All writes go through server actions, validated with Zod before DB. |
| Domain / queries | `lib/domain/` | Read queries and business logic (recurrence, notification fan-out). Organized by feature (tasks, projects, inbox). |
| DB clients | `lib/supabase/` | `client.ts` (browser), `server.ts` (SSR), `admin.ts` (service role), `middleware.ts` (session refresh). |
| Validators | `lib/validators/` | Zod schemas shared between actions and API routes. |
| Env | `lib/env.ts` | Zod-validated env at module load. Use `getClientEnv()` / `getServerEnv()` — never read `process.env` directly. |
| Migrations | `db/migrations/` | Versioned SQL. All business tables have RLS enabled. |

### Key patterns

- **Server Actions are the mutation interface.** Prefer `lib/actions/` over API routes for any state change.
- **Row-Level Security is the authorization layer.** Supabase RLS policies enforce multi-tenant isolation; don't bypass with the service-role client unless intentional (e.g., background jobs).
- **Drawer-based task detail** via `?task=<id>` query param — no full navigation on task open.
- **Domain queries are separate from actions.** `lib/domain/*/queries.ts` for reads; `lib/actions/` for writes.
- **Env validation is strict.** Add new env vars to both `lib/env.ts` schemas and `.env.local.example`.

### Auth & multi-tenancy

- Google OAuth via Supabase Auth. Callback at `/auth/callback`.
- `middleware.ts` refreshes Supabase session on every request.
- `requireUser()` guards all protected server components/actions.
- Workspace membership drives access; projects have `workspace_visible` or `private` privacy.

### Background jobs

`/api/jobs/due-notifications` and `/api/jobs/email-notifications` are HTTP-polled by GitHub Actions workflow (`.github/workflows/email-dispatch.yml`).

## Supabase dependency pinning

`@supabase/ssr` and `@supabase/supabase-js` are pinned (no caret ranges). They must be upgraded together to avoid type-signature drift.

## Backend server safety

The production server is an Oracle VM at `141.148.218.107`.
- **Never run destructive commands on the server** (`rm`, `find -delete`, `git clean -fd`, etc.) even if asked.
- Prefer read-only diagnostics first, then explicit non-destructive changes.

## Commit conventions

Use Conventional Commits:
```
feat(tasks): add recurrence UI
fix(auth): handle expired session redirect
chore(deps): upgrade supabase packages together
```
