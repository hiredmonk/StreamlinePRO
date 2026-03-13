create or replace function create_task_recurrence_for_task(
  p_task_id uuid,
  p_workspace_id uuid,
  p_recurrence_id uuid,
  p_frequency text,
  p_interval integer,
  p_created_by uuid
)
returns uuid
language plpgsql
set search_path = public
as $$
begin
  insert into recurrences (
    id,
    workspace_id,
    pattern_json,
    mode,
    is_paused,
    created_by
  )
  values (
    p_recurrence_id,
    p_workspace_id,
    jsonb_build_object('frequency', p_frequency, 'interval', p_interval),
    'create_on_complete',
    false,
    p_created_by
  );

  update tasks
  set recurrence_id = p_recurrence_id
  where id = p_task_id
    and recurrence_id is null;

  if not found then
    raise exception 'Task recurrence link failed.';
  end if;

  return p_recurrence_id;
end;
$$;

create or replace function clear_task_recurrence_for_task(
  p_task_id uuid,
  p_recurrence_id uuid
)
returns uuid
language plpgsql
set search_path = public
as $$
begin
  update tasks
  set recurrence_id = null
  where id = p_task_id
    and recurrence_id = p_recurrence_id;

  if not found then
    raise exception 'Recurrence does not belong to this task.';
  end if;

  update recurrences
  set is_paused = true
  where id = p_recurrence_id;

  if not found then
    raise exception 'Recurrence not found.';
  end if;

  return p_recurrence_id;
end;
$$;
