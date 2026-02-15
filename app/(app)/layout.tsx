import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { signOutAction } from '@/lib/actions/auth-actions';
import { AppSidebar } from '@/app/components/layout/app-sidebar';
import { getWorkspacesForUser } from '@/lib/domain/projects/queries';

export default async function PrivateLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { user, supabase } = await requireUser();
  const workspaces = await getWorkspacesForUser(supabase, user.id);

  return (
    <div className="app-shell-grid">
      <AppSidebar workspaces={workspaces} userEmail={user.email ?? 'Unknown user'} />
      <div className="px-4 py-4 sm:px-6 sm:py-6 lg:px-10">
        <header className="glass-panel mb-5 flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#6d6a64]">Execution cockpit</p>
            <p className="text-sm text-[#494c49]">Own what matters, without the process noise.</p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/projects"
              className="inline-flex items-center gap-2 rounded-full border border-[#dfd7c1] bg-[#fff8ed] px-4 py-2 text-sm font-semibold text-[#2f342f] transition hover:border-[#d8ba94] hover:bg-[#faeddb]"
            >
              <PlusCircle className="h-4 w-4" />
              New Project
            </Link>
            <form action={signOutAction}>
              <button
                type="submit"
                className="rounded-full border border-[#d9c7bf] bg-[#fff6f4] px-4 py-2 text-sm font-semibold text-[#8e2f2f] transition hover:bg-[#ffede8]"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
