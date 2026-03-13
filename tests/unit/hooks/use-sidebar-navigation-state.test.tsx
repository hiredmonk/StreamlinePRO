import React from 'react';
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useSidebarNavigationState } from '@/lib/hooks/use-sidebar-navigation-state';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/projects'),
  useSearchParams: vi.fn(() => new URLSearchParams('workspace=w1'))
}));

describe('useSidebarNavigationState', () => {
  it('derives active workspace and active nav state from the current route', () => {
    const { result } = renderHook(() => useSidebarNavigationState());

    expect(result.current.isProjectsRoute).toBe(true);
    expect(result.current.activeWorkspaceId).toBe('w1');
    expect(result.current.allWorkspacesActive).toBe(false);
    expect(result.current.isItemActive('/projects')).toBe(true);
    expect(result.current.isItemActive('/inbox')).toBe(false);
  });
});
