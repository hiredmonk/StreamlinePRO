do $$
declare
  next_sort_order bigint;
begin
  if not exists (
    select 1
    from pg_class
    where relkind = 'S'
      and relname = 'task_sort_order_seq'
  ) then
    create sequence task_sort_order_seq;
  end if;

  select coalesce(max(sort_order), 0) + 1
  into next_sort_order
  from tasks;

  perform setval('task_sort_order_seq', greatest(next_sort_order, 1), false);
end;
$$;

alter table tasks
alter column sort_order set default nextval('task_sort_order_seq');

create or replace function allocate_task_sort_order()
returns int
language sql
security definer
set search_path = public
as $$
  select nextval('task_sort_order_seq')::int;
$$;

grant execute on function allocate_task_sort_order() to authenticated;
