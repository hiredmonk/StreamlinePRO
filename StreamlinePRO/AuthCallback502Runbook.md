# Auth Callback 502 Runbook

## Incident Signature

- Domain: `https://streamlinepro.online`
- Symptom: OAuth flow returns `502 Bad Gateway` on callback URL:
  - `https://streamlinepro.online/auth/callback?code=...`
- Nginx error signature:
  - `upstream sent too big header while reading response header from upstream`

## Root Cause

- During OAuth callback, upstream response headers (typically `Set-Cookie` from auth/session exchange) exceeded nginx proxy buffer limits.
- Nginx returned `502` even though the upstream app handled the request.

## Applied Fix (2026-02-15 UTC)

Updated `/etc/nginx/sites-available/streamlinepro.online` inside `location /`:

```nginx
proxy_buffer_size 16k;
proxy_buffers 8 16k;
proxy_busy_buffers_size 32k;
```

Reloaded nginx after syntax validation:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Verification Checklist

Run all checks after applying config:

```bash
sudo systemctl is-active nginx streamlinepro.service
curl -sS -D - -o /dev/null https://streamlinepro.online/signin | sed -n '1,20p'
curl -sS -D - -o /dev/null https://streamlinepro.online/auth/google | sed -n '1,20p'
curl -sS -D - -o /dev/null https://streamlinepro.online/auth/callback | sed -n '1,20p'
```

Expected:

- `/signin` returns `200`.
- `/auth/google` returns `307` to Supabase auth URL.
- `/auth/callback` (without valid `code`) returns `307` to `/signin`.

Confirm no new header-buffer failures:

```bash
sudo grep -n "upstream sent too big header" /var/log/nginx/error.log | tail -n 20
```

## Rollback

Restore nginx config from backup, then reload:

```bash
sudo cp /home/ubuntu/backups/streamlinepro/<timestamp>/streamlinepro.online.nginx.bak /etc/nginx/sites-available/streamlinepro.online
sudo nginx -t
sudo systemctl reload nginx
```

## Runtime Hardening Status

Target hardening (planned but not completed in this pass):

- Switch service from `next dev` to `next start`.
- Ensure Node 20 path precedence in service environment.

Blocked by existing production build failures (`pnpm build`) from known TypeScript issues in application code. Keep current service unchanged until build passes reliably.

## Related Post-Login App Error (Digest `1174338175`)

If login redirects successfully but `/my-tasks` crashes with:

- `Application error ... Digest: 1174338175`

Check app logs:

```bash
sudo journalctl -u streamlinepro.service -n 200 --no-pager
```

Known root cause:

- `PGRST205`: missing `public.workspace_members` in Supabase schema cache.

### Implemented Mitigation

- App guard deployed in `lib/domain/projects/queries.ts`:
  - `PGRST205` for `workspace_members` now returns empty workspace list instead of throwing a 500.

### Required Permanent Fix

Apply reconciliation migration in Supabase SQL Editor:

- `db/migrations/202602151620_reconcile_prod_schema.sql`

Then verify:

```sql
select to_regclass('public.workspace_members');
```

Expected result is `public.workspace_members` (not `NULL`).
