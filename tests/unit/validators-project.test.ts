import { describe, expect, it } from 'vitest';
import {
  createProjectFromTemplateSchema,
  createProjectTemplateSchema,
  createProjectSchema,
  createProjectStatusSchema,
  deleteProjectStatusSchema,
  listProjectTemplatesSchema,
  projectPrivacySchema,
  reorderProjectStatusesSchema,
  updateProjectStatusSchema,
  updateProjectTemplateSchema
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

  it('validates project template create/list/update payloads', () => {
    const createParsed = createProjectTemplateSchema.parse({
      workspaceId: uuid,
      sourceProjectId: uuid,
      name: 'Sprint',
      includeTasks: true,
      actorUserId: uuid
    });
    expect(createParsed.name).toBe('Sprint');

    const listParsed = listProjectTemplatesSchema.parse({
      workspaceId: uuid,
      actorUserId: uuid
    });
    expect(listParsed.workspaceId).toBe(uuid);

    const updateParsed = updateProjectTemplateSchema.parse({
      templateId: uuid,
      includeTasks: false,
      actorUserId: uuid
    });
    expect(updateParsed.includeTasks).toBe(false);
  });

  it('validates clone from template payload including due anchor date', () => {
    const parsed = createProjectFromTemplateSchema.parse({
      workspaceId: uuid,
      templateId: uuid,
      projectName: 'Clone target',
      dueAnchorDate: '2026-03-15',
      actorUserId: uuid
    });

    expect(parsed.dueAnchorDate).toBe('2026-03-15');
  });
});
