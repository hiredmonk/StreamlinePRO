-- StreamlinePRO project templates
-- Date: 2026-03-04

create table if not exists project_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_project_id uuid references projects(id) on delete set null,
  name text not null check (char_length(name) between 2 and 100),
  description text,
  include_tasks boolean not null default false,
  snapshot_json jsonb not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_project_templates_workspace_name_unique
  on project_templates(workspace_id, lower(name));

create index if not exists idx_project_templates_workspace_created
  on project_templates(workspace_id, created_at desc);

drop trigger if exists project_templates_set_updated_at on project_templates;
create trigger project_templates_set_updated_at
before update on project_templates
for each row execute function set_updated_at();

create or replace function app_user_can_access_template(target_template_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from project_templates pt
    where pt.id = target_template_id
      and app_user_in_workspace(pt.workspace_id)
  );
$$;

create or replace function app_user_can_manage_template(target_template_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from project_templates pt
    left join workspace_members wm
      on wm.workspace_id = pt.workspace_id
      and wm.user_id = auth.uid()
    where pt.id = target_template_id
      and (
        pt.created_by = auth.uid()
        or wm.role = 'admin'
      )
  );
$$;

create or replace function app_user_can_create_template(target_project_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from projects p
    where p.id = target_project_id
      and app_user_in_workspace(p.workspace_id)
      and p.privacy = 'workspace_visible'
      and app_user_can_edit_project(p.id)
  );
$$;

alter table project_templates enable row level security;

drop policy if exists "project_templates_select" on project_templates;
create policy "project_templates_select" on project_templates
for select
using (app_user_in_workspace(workspace_id));

drop policy if exists "project_templates_insert" on project_templates;
create policy "project_templates_insert" on project_templates
for insert
with check (
  auth.uid() = created_by
  and app_user_can_create_template(source_project_id)
);

drop policy if exists "project_templates_update" on project_templates;
create policy "project_templates_update" on project_templates
for update
using (app_user_can_manage_template(id))
with check (app_user_can_manage_template(id));

drop policy if exists "project_templates_delete" on project_templates;
create policy "project_templates_delete" on project_templates
for delete
using (app_user_can_manage_template(id));
