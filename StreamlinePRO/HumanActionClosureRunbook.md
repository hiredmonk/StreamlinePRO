# Human Action Closure Runbook
_Last updated: 2026-02-16_

This runbook converts pending human-owned items from `Todo.md` into exact, sequential actions.
Default assumptions used: hosting on `Ubuntu + systemd` via GitHub Actions `deploy.yml`, email provider `Resend`, production URL `https://streamlinepro.online`.

## 0) Track Progress
- [x] 1. End-to-end OAuth callback flow validated in deployed environment
- [x] 2. Real secrets populated locally
- [x] 3. Hosting runtime env vars configured with real values
- [ ] 4. Deployment smoke test completed
- [ ] 5. Production-grade email notification delivery implemented and verified (Resend)
- [ ] 6. Search benchmark profile approved (realistic data volume)
- [ ] 7. Search performance benchmark validated (`<1s` target)
- [ ] 8. Multi-user RLS behavior validated via integration scenarios
- [ ] 9. Full PRD acceptance walkthrough completed
- [ ] 10. Remaining gaps prioritized into next milestone/sprint plan

## 1) Validate OAuth Callback End-to-End
Go here:
- `https://streamlinepro.online/signin` (incognito/private window)

Do this:
1. Click `Continue with Google`.
2. Complete Google consent.
3. Confirm redirect lands on authenticated app page (for example `/my-tasks`) and not back to `/signin`.
4. Refresh the page and confirm session persists.

Pass criteria:
- Successful login + callback + persistent session.

Capture evidence:
- Screenshot of authenticated page URL after login.

Current production status (2026-02-16):
- Callback redirect mismatch is resolved after deploy:
  - `/auth/google` -> `307` with `redirect_to=https://streamlinepro.online/auth/callback`
  - `/auth/callback` (no code) -> `307 https://streamlinepro.online/signin`
- Code hardening is deployed in routes:
  - `app/auth/callback/route.ts`
  - `app/auth/google/route.ts`
- Human E2E Google sign-in validation is confirmed complete (user-validated).

## 2) Populate Real Local Secrets
Go here:
- Local file: `.env.local`.
- Template reference: `.env.local.example`.

Do this:
1. Fill real values for required keys:
   - `NEXT_PUBLIC_APP_URL`
   - `NEXT_PUBLIC_DEFAULT_TIMEZONE`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_JWT_SECRET`
   - `SUPABASE_AUTH_GOOGLE_CLIENT_ID`
   - `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET`
   - `SUPABASE_STORAGE_BUCKET_ATTACHMENTS`
   - `EMAIL_PROVIDER_API_KEY`
   - `EMAIL_FROM_ADDRESS`
2. Start app: `COREPACK_HOME="$PWD/.corepack" corepack pnpm dev`.
3. Confirm app boots without env validation errors.

Pass criteria:
- Local app starts cleanly with real secrets.

Verification status (2026-02-16):
- `.env.local` populated with required keys (user-confirmed).
- Local startup check passed with: `COREPACK_HOME="$PWD/.corepack" corepack pnpm dev`.
- Runtime auth route probes succeeded locally:
  - `GET /auth/callback` -> `307` to `/signin`
  - `GET /auth/google` -> `307` to Supabase authorize URL with local callback target.

## 3) Configure Production Runtime Env Vars (Ubuntu + systemd)
Go here:
- Active runtime env file (current): `/home/ubuntu/streamlinepro/.env.local`.
- GitHub Actions workflow: `.github/workflows/deploy.yml`.

Do this:
1. Add/update all required keys from Step 2 in server runtime env file.
2. Push latest `main` commit and wait for GitHub Actions `CI` then `Deploy Production` workflow to complete.
3. Verify with:
   - `curl -sS -D - -o /dev/null https://streamlinepro.online/auth/google | sed -n '1,24p'`
   - `curl -sS -D - -o /dev/null https://streamlinepro.online/auth/callback | sed -n '1,24p'`
4. Confirm `location` header points to real Supabase project ref and callback URL uses `https://streamlinepro.online/auth/callback`.
5. Confirm `/auth/callback` fallback redirect no longer points to loopback (`0.0.0.0`, `127.0.0.1`, `localhost`).

Pass criteria:
- Production env has real values and auth redirect is correct.

Verification status (2026-02-16):
- Runtime service verified at `/etc/systemd/system/streamlinepro.service` (Next.js on port `3001`).
- Active env file on server is `.env.local` (read-only SSH audit).
- Required keys are all set with non-placeholder values:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_DEFAULT_TIMEZONE`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_SECRET`
  - `SUPABASE_AUTH_GOOGLE_CLIENT_ID`
  - `SUPABASE_AUTH_GOOGLE_CLIENT_SECRET`
  - `SUPABASE_STORAGE_BUCKET_ATTACHMENTS`
  - `EMAIL_PROVIDER_API_KEY`
  - `EMAIL_FROM_ADDRESS`
- Live production probes pass:
  - `/auth/google` -> Supabase authorize URL with `redirect_to=https://streamlinepro.online/auth/callback`
  - `/auth/callback` -> `307 https://streamlinepro.online/signin`.

## 4) Complete Deployment Smoke Test
Go here:
- `https://streamlinepro.online`

Do this (in order):
1. Open `/signin`.
2. Sign in with Google.
3. Open `/my-tasks`.
4. Create a task with Quick Add.
5. Update task status and due date.
6. Open task drawer and add a comment.
7. Upload an attachment.
8. Open `/search` and run a query.
9. Open `/inbox` and mark one notification as read.

Pass criteria:
- No blocking 4xx/5xx errors and data persists after refresh.

Capture evidence:
- One screenshot per route or a timestamped checklist with pass/fail notes.

## 5) Enable and Verify Production Email Delivery (Resend)
Go here:
- Resend Dashboard -> `Domains`.
- Server runtime env file at `/home/ubuntu/streamlinepro/.env`.

Do this:
1. Add your sending domain in Resend.
2. Publish required DNS records (SPF/DKIM) in your domain provider.
3. Wait until domain shows `Verified` in Resend.
4. Create Resend API key.
5. Set production env vars:
   - `EMAIL_PROVIDER_API_KEY=<resend_api_key>`
   - `EMAIL_FROM_ADDRESS=<noreply@your-domain>`
6. Redeploy app via GitHub Actions `Deploy Production` workflow (push to `main`).
7. Trigger a notification-producing action (assignment, mention, due notification path).
8. Confirm delivery in Resend logs and recipient inbox.

Pass criteria:
- Provider accepted + recipient received production email notification.

## 6) Approve Search Benchmark Profile (Realistic Volume)
Go here:
- Team decision note (or add approved values directly to `Todo.md` notes).

Default profile (recommended):
- Users: `50`
- Workspaces: `2`
- Projects per workspace: `30`
- Tasks total: `20,000`
- Comments total: `60,000`
- Attachments total: `5,000`
- Mix: active + done + overdue + waiting statuses

Do this:
1. Confirm/adjust the numbers above.
2. Freeze these values as official benchmark acceptance profile.

Pass criteria:
- Written, approved dataset definition exists.

## 7) Validate Search Performance (`<1s`)
Go here:
- Deployed environment with benchmark dataset loaded.

Do this:
1. Run at least 20 search queries across exact match, prefix, typo-like partial, and no-result cases.
2. Measure API response time for `/api/search?q=...` and UI perceived response.
3. Record p50 and p95.

Pass criteria:
- p95 `< 1s` on approved benchmark profile.

## 8) Validate Multi-User RLS Behavior
Go here:
- Supabase project + three real users:
  - User A (`Admin`)
  - User B (`Member`)
  - User C (`Non-member` or removed member)

Do this:
1. Create `workspace-visible` project and verify User B can read.
2. Create `private` project and verify User C cannot read.
3. Remove a member and verify access is revoked immediately.
4. Verify notifications are visible only to recipient.
5. Verify attachment access is denied outside authorized project/workspace scope.

Pass criteria:
- All expected allow/deny outcomes match PRD and no cross-user leakage appears.

## 9) Complete PRD Acceptance Walkthrough
Go here:
- `PRD/StreamlinePRO.md`

Do this:
1. Walk section-by-section.
2. Mark each acceptance criterion as:
   - `Accepted`
   - `Accepted with Gap`
   - `Deferred`
3. For every gap, add owner and next action.

Pass criteria:
- No PRD acceptance criterion left undecided.

## 10) Prioritize Remaining Gaps
Go here:
- Sprint planning board/doc.

Do this:
1. Convert all open gaps into backlog items.
2. Assign `priority`, `owner`, `target sprint/date`, and `dependency`.
3. Order by business impact and risk.

Pass criteria:
- Ranked, actionable next milestone plan exists.

## Quick Validation Commands
Use these for fast production checks:

```bash
curl -sS -D - -o /dev/null https://streamlinepro.online/signin | sed -n '1,20p'
curl -sS -D - -o /dev/null https://streamlinepro.online/auth/google | sed -n '1,24p'
curl -sS -D - -o /dev/null https://streamlinepro.online/auth/callback | sed -n '1,24p'
```
