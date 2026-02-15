'use server';

import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { markNotificationReadSchema } from '@/lib/validators/inbox';
import { toErrorMessage } from '@/lib/utils';
import type { ActionResult } from '@/lib/actions/types';

export async function markNotificationReadAction(input: {
  id: string;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const parsed = markNotificationReadSchema.parse(input);
    const { supabase } = await requireUser();

    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', parsed.id);

    if (error) {
      throw error;
    }

    revalidatePath('/inbox');

    return { ok: true, data: { id: parsed.id } };
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}
