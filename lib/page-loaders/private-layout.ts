import { requireUser } from '@/lib/auth';
import { getWorkspacesForUser } from '@/lib/domain/projects/queries';

export async function loadPrivateLayoutData() {
  const { user, supabase } = await requireUser();
  const workspaces = await getWorkspacesForUser(supabase, user.id);

  return {
    userEmail: user.email ?? 'Unknown user',
    workspaces
  };
}
