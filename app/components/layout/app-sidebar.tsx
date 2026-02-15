'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, FolderOpenDot, Home, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

type SidebarProps = {
  workspaces: Array<{
    id: string;
    name: string;
    icon: string | null;
    role: 'admin' | 'member';
  }>;
  userEmail: string;
};

const navItems = [
  { href: '/my-tasks', label: 'My Tasks', icon: Home },
  { href: '/projects', label: 'Projects', icon: FolderOpenDot },
  { href: '/inbox', label: 'Inbox', icon: Bell },
  { href: '/search', label: 'Search', icon: Search }
] as const;

export function AppSidebar({ workspaces, userEmail }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="border-r border-[#dfd7c1] bg-[#fffdf6]/80 px-6 py-8 backdrop-blur-sm">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-[0.22em] text-[#5d5d57]">StreamlinePRO</p>
        <h1
          className="mt-3 text-3xl font-semibold tracking-tight text-[#1c221f]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Work with Rhythm
        </h1>
      </div>

      <nav className="space-y-1.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-[15px] transition',
                active
                  ? 'border-[#dd4b39] bg-[#fff3f1] text-[#9e2316]'
                  : 'border-transparent text-[#343b36] hover:border-[#d5ccb3] hover:bg-[#faf4e4]'
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <section className="mt-10">
        <p className="mb-2 text-xs uppercase tracking-[0.2em] text-[#5f625f]">Workspaces</p>
        <ul className="space-y-2">
          {workspaces.map((workspace) => (
            <li
              key={workspace.id}
              className="flex items-center justify-between rounded-lg border border-[#ddd4c0] bg-[#faf6eb] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#2b2f2d]">{workspace.name}</p>
                <p className="text-xs uppercase tracking-wide text-[#777167]">{workspace.role}</p>
              </div>
              <span className="text-lg">{workspace.icon ?? '◍'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-auto pt-10">
        <div className="rounded-xl border border-[#dfd7c1] bg-white/80 p-3">
          <p className="truncate text-sm font-medium text-[#202b23]">{userEmail}</p>
          <p className="text-xs text-[#666a63]">Signed in</p>
        </div>
      </section>
    </aside>
  );
}
