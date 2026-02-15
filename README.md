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

## Environment Files (Important)

- `.env.local.example` is a template with placeholders for local setup.
- `.env.local` is your real local file and is not committed.
- Production does **not** read your local machine `.env.local`; deployed runtime must have its own real env values.

## Production Env Sync Check

After deploying env values, verify auth uses your real Supabase project:

```bash
curl -sI http://streamlinepro.online/auth/google
```

Expected:

- `location` header contains your real Supabase project ref (for example `https://<project-ref>.supabase.co/...`)
- It must **not** contain `your_project_ref`.

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

## Dependency Compatibility

- Supabase dependencies are pinned for CI stability:
  - `@supabase/ssr` and `@supabase/supabase-js` must be upgraded together.
  - Avoid caret (`^`) ranges for these packages to prevent type-signature drift across installs.

## GitHub Actions CD (Server Sync)

Auto-deploy is configured in `.github/workflows/deploy.yml`.

Behavior:

- Runs only after `CI` succeeds for a `push` to `main`.
- Syncs repository files to the server using `rsync` over SSH.
- Preserves server env files (`.env*`) and restarts `streamlinepro.service`.

Required GitHub secret:

- `PROD_SSH_PRIVATE_KEY`: private key used by GitHub Actions to SSH into the server.

Optional GitHub repository variables (defaults shown):

- `PROD_HOST` (default `141.148.218.107`)
- `PROD_USER` (default `ubuntu`)
- `PROD_PATH` (default `/home/ubuntu/streamlinepro`)

Server prerequisite:

- Add the matching public key to `/home/ubuntu/.ssh/authorized_keys` for the deploy user.

## Current Verified Status (2026-02-15)

- `corepack pnpm test` is passing (`39` files, `92` tests)
- `corepack pnpm typecheck` is currently failing due existing Supabase typing issues
- `pnpm lint` and `pnpm test:e2e` were not revalidated in this pass
- Authoritative implementation checklist: `Todo.md`
