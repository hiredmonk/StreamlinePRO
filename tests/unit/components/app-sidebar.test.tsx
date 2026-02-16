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
  usePathname: vi.fn(() => '/projects'),
  useSearchParams: vi.fn(() => new URLSearchParams('workspace=w1'))
}));

describe('AppSidebar', () => {
  it('renders nav items, workspace navigation links, and user email', () => {
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
    expect(screen.getByRole('link', { name: 'New' })).toHaveAttribute('href', '/projects?workspace=new');
    expect(screen.getByText('All workspaces').closest('a')).toHaveAttribute('href', '/projects');
    expect(screen.getByText('Ops').closest('a')).toHaveAttribute('href', '/projects?workspace=w1');
    expect(screen.getByText('owner@example.com')).toBeInTheDocument();
  });
});
