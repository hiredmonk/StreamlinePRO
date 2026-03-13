import type { AppSupabaseClient } from '@/lib/supabase/client-types';

export async function allocateTaskSortOrder(supabase: AppSupabaseClient) {
  const { data, error } = await supabase.rpc('allocate_task_sort_order');

  if (error) {
    throw error;
  }

  if (typeof data !== 'number') {
    throw new Error('Task sort order allocator returned an invalid rank.');
  }

  return data;
}
