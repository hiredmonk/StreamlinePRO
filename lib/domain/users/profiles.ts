import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export type UserProfile = {
  userId: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  initials: string;
};

type UserMetadata = {
  avatar_url?: unknown;
  full_name?: unknown;
  name?: unknown;
  user_name?: unknown;
};

export async function getUserProfileMap(userIds: string[]) {
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (!uniqueIds.length) {
    return {} as Record<string, UserProfile>;
  }

  const admin = createSupabaseAdminClient();
  const profiles = await Promise.all(
    uniqueIds.map(async (userId) => {
      const { data, error } = await admin.auth.admin.getUserById(userId);
      if (error || !data.user) {
        return [userId, buildFallbackProfile(userId)] as const;
      }

      return [userId, buildUserProfile(userId, data.user.email ?? '', data.user.user_metadata)] as const;
    })
  );

  return Object.fromEntries(profiles);
}

export function buildUserProfile(userId: string, email: string, metadata: UserMetadata | null | undefined): UserProfile {
  const displayName = resolveDisplayName(email, metadata);

  return {
    userId,
    email,
    displayName,
    avatarUrl: typeof metadata?.avatar_url === 'string' ? metadata.avatar_url : null,
    initials: buildInitials(displayName, email)
  };
}

function buildFallbackProfile(userId: string): UserProfile {
  return {
    userId,
    email: '',
    displayName: 'Unknown member',
    avatarUrl: null,
    initials: 'UM'
  };
}

function resolveDisplayName(email: string, metadata: UserMetadata | null | undefined) {
  const candidate =
    typeof metadata?.full_name === 'string'
      ? metadata.full_name
      : typeof metadata?.name === 'string'
        ? metadata.name
        : typeof metadata?.user_name === 'string'
          ? metadata.user_name
          : '';

  const trimmed = candidate.trim();
  if (trimmed) {
    return trimmed;
  }

  if (email.includes('@')) {
    return email.split('@')[0]!;
  }

  return 'Unknown member';
}

function buildInitials(displayName: string, email: string) {
  const fromName = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');

  if (fromName) {
    return fromName;
  }

  if (email) {
    return email.slice(0, 2).toUpperCase();
  }

  return 'UM';
}
