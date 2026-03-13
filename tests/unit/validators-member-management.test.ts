import { describe, expect, it } from 'vitest';
import {
  inviteWorkspaceMemberSchema,
  listWorkspaceMembersSchema,
  removeWorkspaceMemberSchema,
  updateWorkspaceMemberRoleSchema
} from '@/lib/validators/member-management';

const uuid = '11111111-1111-4111-8111-111111111111';
const uuid2 = '22222222-2222-4222-8222-222222222222';

describe('member-management validators', () => {
  it('parses valid invite payloads and normalizes role enum', () => {
    const parsed = inviteWorkspaceMemberSchema.parse({
      workspaceId: uuid,
      email: 'owner@example.com',
      role: 'member',
      invitedByUserId: uuid2
    });

    expect(parsed.email).toBe('owner@example.com');
    expect(parsed.role).toBe('member');
  });

  it('rejects invalid invite payloads', () => {
    const result = inviteWorkspaceMemberSchema.safeParse({
      workspaceId: 'not-a-uuid',
      email: 'not-an-email',
      role: 'owner',
      invitedByUserId: uuid2
    });

    expect(result.success).toBe(false);
  });

  it('parses role update and member list payloads', () => {
    expect(
      updateWorkspaceMemberRoleSchema.safeParse({
        workspaceId: uuid,
        memberUserId: uuid2,
        nextRole: 'admin',
        actorUserId: uuid
      }).success
    ).toBe(true);

    expect(
      listWorkspaceMembersSchema.safeParse({
        workspaceId: uuid,
        actorUserId: uuid2
      }).success
    ).toBe(true);
  });

  it('trims and validates optional remove reason', () => {
    const parsed = removeWorkspaceMemberSchema.parse({
      workspaceId: uuid,
      memberUserId: uuid2,
      actorUserId: uuid,
      reason: '  left workspace  '
    });
    expect(parsed.reason).toBe('left workspace');

    const emptyReason = removeWorkspaceMemberSchema.safeParse({
      workspaceId: uuid,
      memberUserId: uuid2,
      actorUserId: uuid,
      reason: '    '
    });
    expect(emptyReason.success).toBe(false);
  });
});
