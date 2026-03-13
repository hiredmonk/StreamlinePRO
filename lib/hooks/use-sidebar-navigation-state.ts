'use client';

import { usePathname, useSearchParams } from 'next/navigation';

export type SidebarNavigationState = {
  isProjectsRoute: boolean;
  activeWorkspaceId: string | null;
  allWorkspacesActive: boolean;
  isItemActive: (href: string) => boolean;
};

export function useSidebarNavigationState(): SidebarNavigationState {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isProjectsRoute = pathname.startsWith('/projects');
  const activeWorkspaceId = isProjectsRoute ? searchParams.get('workspace') : null;
  const allWorkspacesActive = isProjectsRoute && !activeWorkspaceId;

  return {
    isProjectsRoute,
    activeWorkspaceId,
    allWorkspacesActive,
    isItemActive(href: string) {
      return pathname.startsWith(href);
    }
  };
}
