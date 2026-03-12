import { describe, expect, it } from 'vitest';
import {
  createWorkspaceInviteSchema,
  createWorkspaceSchema,
  workspaceInviteIdSchema
} from '@/lib/validators/workspace';

const uuid = '11111111-1111-4111-8111-111111111111';

describe('workspace validators', () => {
  it('rejects short workspace names', () => {
    const result = createWorkspaceSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  it('defaults invite role to member for valid payloads', () => {
    const parsed = createWorkspaceInviteSchema.parse({
      workspaceId: uuid,
      email: 'alex@example.com'
    });

    expect(parsed.role).toBe('member');
  });

  it('rejects malformed workspace invite ids', () => {
    expect(workspaceInviteIdSchema.safeParse('not-a-uuid').success).toBe(false);
  });
});
