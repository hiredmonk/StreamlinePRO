import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/lib/supabase/types';
import { getClientEnv } from '@/lib/env';

export async function createServerSupabaseClient() {
  const env = getClientEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookieValues: Parameters<SetAllCookies>[0]) {
          try {
            cookieValues.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // In Server Components this can be read-only; middleware refresh handles persistence.
          }
        }
      }
    }
  );
}
