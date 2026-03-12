import { describe, expect, it } from 'vitest';
import {
  createProjectSchema,
  createProjectStatusSchema,
  deleteProjectStatusSchema,
  projectPrivacySchema,
  reorderProjectStatusesSchema,
  updateProjectStatusSchema
} from '@/lib/validators/project';

const uuid = '11111111-1111-4111-8111-111111111111';

describe('project validators', () => {
  it('applies default project privacy', () => {
    const parsed = createProjectSchema.parse({
      workspaceId: uuid,
      name: 'Roadmap'
    });

    expect(parsed.privacy).toBe('workspace_visible');
  });

  it('accepts known privacy values', () => {
    expect(projectPrivacySchema.parse('private')).toBe('private');
  });

  it('validates status create and update payloads', () => {
    const createParsed = createProjectStatusSchema.parse({
      projectId: uuid,
      name: 'Blocked',
      color: '#123456',
      isDone: false
    });
    expect(createParsed.name).toBe('Blocked');

    const updateParsed = updateProjectStatusSchema.parse({
      id: uuid,
      name: 'Waiting'
    });
    expect(updateParsed.name).toBe('Waiting');
  });

  it('rejects duplicate ids in reorder payload', () => {
    const result = reorderProjectStatusesSchema.safeParse({
      projectId: uuid,
      orderedStatusIds: [uuid, uuid]
    });
    expect(result.success).toBe(false);
  });

  it('rejects deleting a status into itself', () => {
    const result = deleteProjectStatusSchema.safeParse({
      id: uuid,
      fallbackStatusId: uuid
    });
    expect(result.success).toBe(false);
  });
});
