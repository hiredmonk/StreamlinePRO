import { getProjectAssignmentScopes } from '@/lib/domain/tasks/assignees';
import { getUserProfileMap, type UserProfile } from '@/lib/domain/users/profiles';
import type { AppSupabaseClient } from '@/lib/supabase/client-types';

export type AssigneeOption = UserProfile;

export async function loadProjectAssignees(
  supabase: AppSupabaseClient,
  projectIds: string[]
): Promise<Record<string, AssigneeOption[]>> {
  const scopes = await getProjectAssignmentScopes(supabase, projectIds);
  const userIds = Object.values(scopes).flatMap((scope) => scope.assignableUserIds);
  const profileMap = await getUserProfileMap(userIds);

  return Object.fromEntries(
    Object.entries(scopes).map(([projectId, scope]) => [
      projectId,
      scope.assignableUserIds
        .map((userId) => profileMap[userId])
        .filter((profile): profile is AssigneeOption => Boolean(profile))
        .sort(compareUserProfiles)
    ])
  );
}

function compareUserProfiles(a: UserProfile, b: UserProfile) {
  return `${a.displayName} ${a.email}`.localeCompare(`${b.displayName} ${b.email}`);
}
