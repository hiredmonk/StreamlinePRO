-- StreamlinePRO initial schema
-- Date: 2026-02-15

create extension if not exists pgcrypto;
create extension if not exists pg_trgm;

create type workspace_role as enum ('admin', 'member');
create type project_privacy as enum ('workspace_visible', 'private');
create type project_member_role as enum ('editor', 'viewer');
create type task_priority as enum ('low', 'medium', 'high');
create type recurrence_mode as enum ('create_on_complete', 'create_on_schedule');
create type notification_channel as enum ('in_app', 'email');
create type notification_type as enum ('assignment', 'mention', 'due_soon', 'overdue', 'comment', 'system');
create type notification_entity_type as enum ('task', 'project', 'comment', 'workspace');

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  icon text,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists workspace_members (
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  description text,
  privacy project_privacy not null default 'workspace_visible',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists project_members (
  project_id uuid not null references projects(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role project_member_role not null default 'editor',
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);

create table if not exists project_sections (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists project_statuses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  color text not null default '#6e7781',
  sort_order int not null default 0,
  is_done boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists recurrences (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  pattern_json jsonb not null,
  mode recurrence_mode not null default 'create_on_complete',
  next_run_at timestamptz,
  is_paused boolean not null default false,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  section_id uuid references project_sections(id) on delete set null,
  status_id uuid not null references project_statuses(id) on delete restrict,
  title text not null check (char_length(title) between 1 and 160),
  description text,
  assignee_id uuid references auth.users(id) on delete set null,
  creator_id uuid not null references auth.users(id) on delete restrict,
  due_at timestamptz,
  due_timezone text,
  priority task_priority,
  parent_task_id uuid references tasks(id) on delete cascade,
  recurrence_id uuid references recurrences(id) on delete set null,
  is_today boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);

create table if not exists task_attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  storage_path text not null,
  file_name text not null,
  mime_type text not null,
  size bigint not null check (size >= 0),
  uploaded_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  channel notification_channel not null default 'in_app',
  type notification_type not null,
  entity_type notification_entity_type not null,
  entity_id uuid not null,
  payload_json jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_workspace_members_user on workspace_members(user_id);
create index if not exists idx_projects_workspace on projects(workspace_id);
create index if not exists idx_project_members_user on project_members(user_id);
create index if not exists idx_project_statuses_project_order on project_statuses(project_id, sort_order);
create index if not exists idx_project_sections_project_order on project_sections(project_id, sort_order);
create index if not exists idx_tasks_project on tasks(project_id);
create index if not exists idx_tasks_assignee_due on tasks(assignee_id, due_at);
create index if not exists idx_tasks_status on tasks(status_id);
create index if not exists idx_tasks_parent on tasks(parent_task_id);
create index if not exists idx_task_comments_task on task_comments(task_id, created_at);
create index if not exists idx_task_activity_task on task_activity(task_id, created_at);
create index if not exists idx_notifications_user_created on notifications(user_id, created_at desc);
create index if not exists idx_notifications_workspace on notifications(workspace_id);
create index if not exists idx_tasks_title_trgm on tasks using gin (title gin_trgm_ops);

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger projects_set_updated_at
before update on projects
for each row execute function set_updated_at();

create trigger tasks_set_updated_at
before update on tasks
for each row execute function set_updated_at();

create or replace function app_user_in_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = auth.uid()
  );
$$;

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
    where p.id = target_project_id
      and (
        p.privacy = 'workspace_visible'
        and app_user_in_workspace(p.workspace_id)
        or pm.user_id is not null
      )
  );
$$;

create or replace function app_user_can_edit_project(target_project_id uuid)
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
        pm.role = 'editor'
        or wm.role = 'admin'
        or p.created_by = auth.uid()
      )
  );
$$;

alter table workspaces enable row level security;
alter table workspace_members enable row level security;
alter table projects enable row level security;
alter table project_members enable row level security;
alter table project_sections enable row level security;
alter table project_statuses enable row level security;
alter table recurrences enable row level security;
alter table tasks enable row level security;
alter table task_comments enable row level security;
alter table task_attachments enable row level security;
alter table task_activity enable row level security;
alter table notifications enable row level security;

create policy "workspace_select" on workspaces
for select
using (app_user_in_workspace(id));

create policy "workspace_insert" on workspaces
for insert
with check (auth.uid() = created_by);

create policy "workspace_update" on workspaces
for update
using (
  exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
);

create policy "workspace_members_select" on workspace_members
for select
using (app_user_in_workspace(workspace_id));

create policy "workspace_members_insert" on workspace_members
for insert
with check (
  (
    workspace_members.user_id = auth.uid()
    and exists (
      select 1
      from workspaces w
      where w.id = workspace_members.workspace_id
        and w.created_by = auth.uid()
    )
  )
  or exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
);

create policy "workspace_members_update" on workspace_members
for update
using (
  exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
)
with check (
  exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
);

create policy "workspace_members_delete" on workspace_members
for delete
using (
  exists (
    select 1
    from workspace_members wm
    where wm.workspace_id = workspace_members.workspace_id
      and wm.user_id = auth.uid()
      and wm.role = 'admin'
  )
);

create policy "projects_select" on projects
for select
using (app_user_can_access_project(id));

create policy "projects_insert" on projects
for insert
with check (app_user_in_workspace(workspace_id));

create policy "projects_update" on projects
for update
using (app_user_can_edit_project(id))
with check (app_user_can_edit_project(id));

create policy "projects_delete" on projects
for delete
using (app_user_can_edit_project(id));

create policy "project_members_select" on project_members
for select
using (app_user_can_access_project(project_id));

create policy "project_members_insert" on project_members
for insert
with check (app_user_can_edit_project(project_id));

create policy "project_members_update" on project_members
for update
using (app_user_can_edit_project(project_id))
with check (app_user_can_edit_project(project_id));

create policy "project_members_delete" on project_members
for delete
using (app_user_can_edit_project(project_id));

create policy "project_sections_select" on project_sections
for select
using (app_user_can_access_project(project_id));

create policy "project_sections_modify" on project_sections
for all
using (app_user_can_edit_project(project_id))
with check (app_user_can_edit_project(project_id));

create policy "project_statuses_select" on project_statuses
for select
using (app_user_can_access_project(project_id));

create policy "project_statuses_modify" on project_statuses
for all
using (app_user_can_edit_project(project_id))
with check (app_user_can_edit_project(project_id));

create policy "recurrences_select" on recurrences
for select
using (app_user_in_workspace(workspace_id));

create policy "recurrences_modify" on recurrences
for all
using (app_user_in_workspace(workspace_id))
with check (app_user_in_workspace(workspace_id));

create policy "tasks_select" on tasks
for select
using (app_user_can_access_project(project_id));

create policy "tasks_insert" on tasks
for insert
with check (app_user_can_edit_project(project_id));

create policy "tasks_update" on tasks
for update
using (app_user_can_edit_project(project_id))
with check (app_user_can_edit_project(project_id));

create policy "tasks_delete" on tasks
for delete
using (app_user_can_edit_project(project_id));

create policy "task_comments_select" on task_comments
for select
using (
  exists (
    select 1
    from tasks t
    where t.id = task_comments.task_id
      and app_user_can_access_project(t.project_id)
  )
);

create policy "task_comments_modify" on task_comments
for all
using (
  exists (
    select 1
    from tasks t
    where t.id = task_comments.task_id
      and app_user_can_edit_project(t.project_id)
  )
)
with check (
  exists (
    select 1
    from tasks t
    where t.id = task_comments.task_id
      and app_user_can_edit_project(t.project_id)
  )
);

create policy "task_attachments_select" on task_attachments
for select
using (
  exists (
    select 1
    from tasks t
    where t.id = task_attachments.task_id
      and app_user_can_access_project(t.project_id)
  )
);

create policy "task_attachments_modify" on task_attachments
for all
using (
  exists (
    select 1
    from tasks t
    where t.id = task_attachments.task_id
      and app_user_can_edit_project(t.project_id)
  )
)
with check (
  exists (
    select 1
    from tasks t
    where t.id = task_attachments.task_id
      and app_user_can_edit_project(t.project_id)
  )
);

create policy "task_activity_select" on task_activity
for select
using (
  exists (
    select 1
    from tasks t
    where t.id = task_activity.task_id
      and app_user_can_access_project(t.project_id)
  )
);

create policy "task_activity_insert" on task_activity
for insert
with check (
  exists (
    select 1
    from tasks t
    where t.id = task_activity.task_id
      and app_user_can_edit_project(t.project_id)
  )
);

create policy "notifications_select" on notifications
for select
using (auth.uid() = user_id);

create policy "notifications_update" on notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "notifications_insert" on notifications
for insert
with check (app_user_in_workspace(workspace_id));

insert into storage.buckets (id, name, public)
values ('task-attachments', 'task-attachments', false)
on conflict (id) do nothing;

create policy "attachments_bucket_select" on storage.objects
for select
using (
  bucket_id = 'task-attachments'
  and app_user_in_workspace((storage.foldername(name))[1]::uuid)
);

create policy "attachments_bucket_insert" on storage.objects
for insert
with check (
  bucket_id = 'task-attachments'
  and app_user_in_workspace((storage.foldername(name))[1]::uuid)
);

create policy "attachments_bucket_delete" on storage.objects
for delete
using (
  bucket_id = 'task-attachments'
  and app_user_in_workspace((storage.foldername(name))[1]::uuid)
);
