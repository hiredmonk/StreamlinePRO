import type { createServerSupabaseClient } from '@/lib/supabase/server';

export type AppSupabaseClient = Awaited<ReturnType<typeof createServerSupabaseClient>>;
