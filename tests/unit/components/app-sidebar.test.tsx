import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppSidebar } from '@/app/components/layout/app-sidebar';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  )
}));
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(() => '/projects')
}));

describe('AppSidebar', () => {
  it('renders nav items, workspace list, and user email', () => {
    render(
      <AppSidebar
        userEmail="owner@example.com"
        workspaces={[
          { id: 'w1', name: 'Ops', icon: '⚙️', role: 'admin' },
          { id: 'w2', name: 'Marketing', icon: null, role: 'member' }
        ]}
      />
    );

    expect(screen.getByText('Projects')).toBeInTheDocument();
    expect(screen.getByText('Ops')).toBeInTheDocument();
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
  });
});
