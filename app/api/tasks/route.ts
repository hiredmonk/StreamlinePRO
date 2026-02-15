import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createTaskSchema, updateTaskSchema } from '@/lib/validators/task';

export async function POST(request: NextRequest) {
  const payload = await request.json();
  const parsed = createTaskSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: orderRows, error: orderError } = await supabase
    .from('tasks')
    .select('sort_order')
    .eq('project_id', parsed.data.projectId)
    .order('sort_order', { ascending: false })
    .limit(1);

  if (orderError) {
    return NextResponse.json({ error: orderError.message }, { status: 500 });
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      project_id: parsed.data.projectId,
      section_id: parsed.data.sectionId ?? null,
      status_id: parsed.data.statusId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      assignee_id: parsed.data.assigneeId ?? user.id,
      creator_id: user.id,
      due_at: parsed.data.dueAt ?? null,
      due_timezone: parsed.data.dueTimezone ?? null,
      priority: parsed.data.priority ?? null,
      parent_task_id: parsed.data.parentTaskId ?? null,
      recurrence_id: parsed.data.recurrenceId ?? null,
      is_today: parsed.data.isToday ?? false,
      sort_order: (orderRows?.[0]?.sort_order ?? 0) + 1
    })
    .select('id')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ taskId: data.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const payload = await request.json();
  const parsed = updateTaskSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id, ...rest } = parsed.data;

  const { error } = await supabase
    .from('tasks')
    .update({
      title: rest.title,
      description: rest.description,
      assignee_id: rest.assigneeId,
      due_at: rest.dueAt,
      due_timezone: rest.dueTimezone,
      status_id: rest.statusId,
      section_id: rest.sectionId,
      priority: rest.priority,
      is_today: rest.isToday,
      completed_at: rest.completedAt,
      sort_order: rest.sortOrder,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ taskId: id });
}
