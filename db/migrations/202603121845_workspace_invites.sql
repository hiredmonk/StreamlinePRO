create table if not exists workspace_invites (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  email text not null,
  role workspace_role not null default 'member',
  invited_by uuid not null references auth.users(id) on delete restrict,
  accepted_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz
);

create index if not exists idx_workspace_invites_workspace_created
on workspace_invites(workspace_id, created_at desc);

create unique index if not exists idx_workspace_invites_active_email
on workspace_invites(workspace_id, lower(email))
where accepted_at is null and revoked_at is null;

alter table workspace_invites enable row level security;

create policy "workspace_invites_select" on workspace_invites
for select
using (
  exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
);

create policy "workspace_invites_insert" on workspace_invites
for insert
with check (
  exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
);

create policy "workspace_invites_update" on workspace_invites
for update
using (
  exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = workspace_invites.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
);
