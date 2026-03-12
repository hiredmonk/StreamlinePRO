import { format } from 'date-fns';
import { Button } from '@/app/components/ui/button';
import {
  cancelWorkspaceInviteFromForm,
  createWorkspaceInviteFromForm,
  removeWorkspaceMemberFromForm,
  updateWorkspaceMemberRoleFromForm
} from '@/lib/actions/form-actions';

type TeamAccessPanelProps = {
  workspaceId: string;
  members: Array<{
    userId: string;
    role: 'admin' | 'member';
    createdAt: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    initials: string;
  }>;
  pendingInvites: Array<{
    id: string;
    email: string;
    role: 'admin' | 'member';
    createdAt: string;
  }>;
};

export function TeamAccessPanel({
  id,
  workspaceId,
  members,
  pendingInvites
}: TeamAccessPanelProps & { id?: string }) {
  return (
    <section id={id} className="glass-panel space-y-5 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#6f675d]">Team access</p>
        <h2 className="text-2xl font-semibold text-[#1f241f]" style={{ fontFamily: 'var(--font-display)' }}>
          Members and invites
        </h2>
        <p className="mt-1 text-sm text-[#5d635e]">
          Invite teammates, promote admins, and remove workspace access without leaving the projects view.
        </p>
      </div>

      <form
        action={createWorkspaceInviteFromForm}
        className="grid gap-2 rounded-xl border border-[#e2d8c2] bg-[#fff9ee] p-3 md:grid-cols-[1.5fr_150px_auto]"
      >
        <input type="hidden" name="workspaceId" value={workspaceId} />
        <input
          required
          type="email"
          name="email"
          placeholder="Invite by email"
          className="h-10 rounded-lg border border-[#d8ccb3] bg-white px-3 text-sm"
        />
        <select
          name="role"
          defaultValue="member"
          className="h-10 rounded-lg border border-[#d8ccb3] bg-white px-3 text-sm"
        >
          <option value="member">Member</option>
          <option value="admin">Admin</option>
        </select>
        <Button type="submit" tone="brand">
          Send invite
        </Button>
      </form>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Members</h3>
            <p className="mt-1 text-sm text-[#6f746f]">
              Role changes apply immediately. Removing a member unassigns their open work in this workspace.
            </p>
          </div>

          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.userId}
                className="rounded-xl border border-[#ddd2bc] bg-[#fffdf8] p-3"
              >
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#d9ccb4] bg-[#f8ecd4] text-sm font-semibold text-[#5f513d]">
                      {member.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#2d332e]">{member.displayName}</p>
                      <p className="truncate text-xs text-[#6d726d]">{member.email}</p>
                      <p className="mt-1 text-[11px] uppercase tracking-[0.12em] text-[#8a8378]">
                        Joined {format(new Date(member.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-[150px_auto]">
                    <form action={updateWorkspaceMemberRoleFromForm} className="flex gap-2">
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="userId" value={member.userId} />
                      <select
                        name="role"
                        defaultValue={member.role}
                        className="h-10 rounded-lg border border-[#d8ccb3] bg-white px-3 text-sm"
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <Button type="submit" tone="neutral">
                        Save
                      </Button>
                    </form>

                    <form action={removeWorkspaceMemberFromForm}>
                      <input type="hidden" name="workspaceId" value={workspaceId} />
                      <input type="hidden" name="userId" value={member.userId} />
                      <Button type="submit" tone="danger">
                        Remove
                      </Button>
                    </form>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Pending invites</h3>
            <p className="mt-1 text-sm text-[#6f746f]">
              P0 supports create and cancel. Resend stays deferred to keep the flow simple.
            </p>
          </div>

          {pendingInvites.length ? (
            <ul className="space-y-2">
              {pendingInvites.map((invite) => (
                <li
                  key={invite.id}
                  className="rounded-xl border border-[#ddd2bc] bg-[#fffdf8] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#2d332e]">{invite.email}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.12em] text-[#8a8378]">
                        {invite.role} invited {format(new Date(invite.createdAt), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <form action={cancelWorkspaceInviteFromForm}>
                      <input type="hidden" name="inviteId" value={invite.id} />
                      <Button type="submit" tone="ghost" size="sm">
                        Cancel
                      </Button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-[#d8ccb6] px-4 py-5 text-sm text-[#727770]">
              No pending invites right now.
            </p>
          )}
        </section>
      </div>
    </section>
  );
}
