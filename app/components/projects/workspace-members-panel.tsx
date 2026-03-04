import { Button } from '@/app/components/ui/button';
import {
  inviteWorkspaceMemberFromForm,
  removeWorkspaceMemberFromForm,
  updateWorkspaceMemberRoleFromForm
} from '@/lib/actions/form-actions';
import type { WorkspaceMemberSummary } from '@/lib/contracts/member-management';
import type { WorkspaceSummary } from '@/lib/domain/projects/queries';

type WorkspaceMembersPanelProps = {
  workspace: WorkspaceSummary;
  actorUserId: string;
  members: WorkspaceMemberSummary[];
};

export function WorkspaceMembersPanel({
  workspace,
  actorUserId,
  members
}: WorkspaceMembersPanelProps) {
  const canManageMembers = workspace.role === 'admin';

  return (
    <section className="glass-panel space-y-4 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#6f675d]">Workspace members</p>
        <h2 className="text-2xl font-semibold text-[#1f241f]" style={{ fontFamily: 'var(--font-display)' }}>
          Team access
        </h2>
        <p className="mt-1 text-sm text-[#5d635e]">
          {canManageMembers
            ? 'Invite members, adjust roles, and remove access from this workspace.'
            : 'You can view members in this workspace. Admins manage invites and role changes.'}
        </p>
      </div>

      {canManageMembers ? (
        <form
          action={inviteWorkspaceMemberFromForm}
          className="grid gap-2 rounded-xl border border-[#e2d8c2] bg-[#fff9ee] p-3 md:grid-cols-[1.5fr_140px_auto]"
        >
          <input type="hidden" name="workspaceId" value={workspace.id} />
          <input type="hidden" name="invitedByUserId" value={actorUserId} />
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
            Invite
          </Button>
        </form>
      ) : null}

      <div className="space-y-3">
        {members.map((member) => (
          <article key={member.userId} className="rounded-xl border border-[#ddd2bc] bg-[#fffdf8] p-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#222621]">{member.email}</p>
                <p className="text-xs uppercase tracking-[0.16em] text-[#7d766c]">
                  Joined {formatJoinedAt(member.joinedAt)}
                </p>
              </div>
              <span className="rounded-full border border-[#d8ccb4] bg-[#fff9ea] px-2 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#5f5a4c]">
                {member.role}
              </span>
            </div>

            {canManageMembers ? (
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_auto]">
                <form
                  action={updateWorkspaceMemberRoleFromForm}
                  className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-center"
                >
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <input type="hidden" name="memberUserId" value={member.userId} />
                  <input type="hidden" name="actorUserId" value={actorUserId} />
                  <select
                    name="nextRole"
                    defaultValue={member.role}
                    className="h-10 rounded-lg border border-[#d8ccb3] bg-white px-3 text-sm"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button type="submit" tone="neutral">
                    Save role
                  </Button>
                </form>

                <form action={removeWorkspaceMemberFromForm} className="sm:justify-self-end">
                  <input type="hidden" name="workspaceId" value={workspace.id} />
                  <input type="hidden" name="memberUserId" value={member.userId} />
                  <input type="hidden" name="actorUserId" value={actorUserId} />
                  <Button type="submit" tone="danger">
                    Remove
                  </Button>
                </form>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function formatJoinedAt(joinedAt: string) {
  const joinedDate = new Date(joinedAt);

  if (Number.isNaN(joinedDate.getTime())) {
    return joinedAt;
  }

  return joinedDate.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}
