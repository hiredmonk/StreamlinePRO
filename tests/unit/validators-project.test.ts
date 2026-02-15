import { describe, expect, it } from 'vitest';
import { createProjectSchema, createWorkspaceSchema, projectPrivacySchema } from '@/lib/validators/project';

const uuid = '11111111-1111-4111-8111-111111111111';

describe('project validators', () => {
  it('applies default project privacy', () => {
    const parsed = createProjectSchema.parse({
      workspaceId: uuid,
      name: 'Roadmap'
    });

    expect(parsed.privacy).toBe('workspace_visible');
  });

  it('rejects short names for workspace', () => {
    const result = createWorkspaceSchema.safeParse({ name: 'A' });
    expect(result.success).toBe(false);
  });

  it('accepts known privacy values', () => {
    expect(projectPrivacySchema.parse('private')).toBe('private');
  });
});
