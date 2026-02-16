-- Fix workspace bootstrap RLS deadlock and backfill orphan owner memberships.
-- Date: 2026-02-16

create or replace function app_user_is_workspace_creator(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from workspaces w
    where w.id = target_workspace_id
      and w.created_by = auth.uid()
  );
$$;

drop policy if exists "workspace_select" on workspaces;

create policy "workspace_select" on workspaces
for select
using (
  app_user_in_workspace(id)
  or created_by = auth.uid()
);

drop policy if exists "workspace_members_insert" on workspace_members;

create policy "workspace_members_insert" on workspace_members
for insert
with check (
  (
    workspace_members.user_id = auth.uid()
    and app_user_is_workspace_creator(workspace_members.workspace_id)
  )
  or exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
);

insert into workspace_members (workspace_id, user_id, role)
select w.id, w.created_by, 'admin'::workspace_role
from workspaces w
left join workspace_members wm
  on wm.workspace_id = w.id
 and wm.user_id = w.created_by
where wm.workspace_id is null
on conflict (workspace_id, user_id) do nothing;
