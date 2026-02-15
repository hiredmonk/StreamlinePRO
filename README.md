# StreamlinePRO

Asana-style work management platform for teams, built with Next.js 15 + Supabase.

## Quick Start
1. Install dependencies:
```bash
pnpm install
```
2. Copy or edit local env:
```bash
cp .env.local.example .env.local
```
3. Run development server:
```bash
pnpm dev
```

## Database Setup
Apply migration in your Supabase project:
- `db/migrations/202602151300_init.sql`

Then verify:
- Google auth provider configured in Supabase
- Redirect URL includes `http://127.0.0.1:3000/auth/callback`
- Bucket `task-attachments` exists

## Scripts
- `pnpm dev` - run app locally
- `pnpm build` - production build
- `pnpm lint` - lint checks
- `pnpm typecheck` - TypeScript checks
- `pnpm test` - unit tests
- `pnpm test:e2e` - Playwright tests

## Current Verified Status (2026-02-15)
- `corepack pnpm test` is passing (`39` files, `92` tests)
- `corepack pnpm typecheck` is currently failing due existing Supabase typing issues
- `pnpm lint` and `pnpm test:e2e` were not revalidated in this pass
- Authoritative implementation checklist: `Todo.md`
