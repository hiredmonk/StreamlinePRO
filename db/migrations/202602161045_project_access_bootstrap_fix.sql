-- Ensure project creators and workspace admins can immediately read projects during bootstrap.
-- Date: 2026-02-16

create or replace function app_user_can_access_project(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    left join project_members pm
      on pm.project_id = p.id
      and pm.user_id = auth.uid()
    left join workspace_members wm
      on wm.workspace_id = p.workspace_id
      and wm.user_id = auth.uid()
    where p.id = target_project_id
      and (
        (
          p.privacy = 'workspace_visible'
          and app_user_in_workspace(p.workspace_id)
        )
        or pm.user_id is not null
        or p.created_by = auth.uid()
        or wm.role = 'admin'
      )
  );
$$;
