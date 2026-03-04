-- StreamlinePRO project templates
-- Date: 2026-03-04

create table if not exists project_templates (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  source_project_id uuid references projects(id) on delete set null,
  name text not null check (char_length(name) between 2 and 100),
  include_tasks boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_template_statuses (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references project_templates(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#6e7781',
  is_done boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists project_template_sections (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references project_templates(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists project_template_tasks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references project_templates(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  status_name text,
  section_name text,
  due_offset_days int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_project_templates_workspace_name_unique
  on project_templates(workspace_id, lower(name));

create index if not exists idx_project_templates_workspace_created
  on project_templates(workspace_id, created_at desc);

create index if not exists idx_project_template_statuses_template_order
  on project_template_statuses(template_id, sort_order);

create index if not exists idx_project_template_sections_template_order
  on project_template_sections(template_id, sort_order);

create index if not exists idx_project_template_tasks_template_order
  on project_template_tasks(template_id, sort_order);

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

create or replace function app_user_can_create_template(
  target_workspace_id uuid,
  target_source_project_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    app_user_in_workspace(target_workspace_id)
    and target_source_project_id is not null
    and exists (
      select 1
      from projects p
      where p.id = target_source_project_id
        and p.workspace_id = target_workspace_id
        and app_user_can_edit_project(p.id)
    );
$$;

alter table project_templates enable row level security;
alter table project_template_statuses enable row level security;
alter table project_template_sections enable row level security;
alter table project_template_tasks enable row level security;

drop policy if exists "project_templates_select" on project_templates;
create policy "project_templates_select" on project_templates
for select
using (app_user_in_workspace(workspace_id));

drop policy if exists "project_templates_insert" on project_templates;
create policy "project_templates_insert" on project_templates
for insert
with check (
  auth.uid() = created_by
  and app_user_can_create_template(workspace_id, source_project_id)
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

drop policy if exists "project_template_statuses_select" on project_template_statuses;
create policy "project_template_statuses_select" on project_template_statuses
for select
using (app_user_can_access_template(template_id));

drop policy if exists "project_template_statuses_modify" on project_template_statuses;
create policy "project_template_statuses_modify" on project_template_statuses
for all
using (app_user_can_manage_template(template_id))
with check (app_user_can_manage_template(template_id));

drop policy if exists "project_template_sections_select" on project_template_sections;
create policy "project_template_sections_select" on project_template_sections
for select
using (app_user_can_access_template(template_id));

drop policy if exists "project_template_sections_modify" on project_template_sections;
create policy "project_template_sections_modify" on project_template_sections
for all
using (app_user_can_manage_template(template_id))
with check (app_user_can_manage_template(template_id));

drop policy if exists "project_template_tasks_select" on project_template_tasks;
create policy "project_template_tasks_select" on project_template_tasks
for select
using (app_user_can_access_template(template_id));

drop policy if exists "project_template_tasks_modify" on project_template_tasks;
create policy "project_template_tasks_modify" on project_template_tasks
for all
using (app_user_can_manage_template(template_id))
with check (app_user_can_manage_template(template_id));
