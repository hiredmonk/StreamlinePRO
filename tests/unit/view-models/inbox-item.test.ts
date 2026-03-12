import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getInboxItemMeta } from '@/lib/view-models/inbox-item';

describe('getInboxItemMeta', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-15T12:00:00.000Z'));
  });

  it('builds task notification metadata', () => {
    expect(
      getInboxItemMeta({
        type: 'assignment',
        entity_type: 'task',
        entity_id: 'task-1234',
        read_at: null,
        created_at: '2026-02-15T10:00:00.000Z'
      })
    ).toEqual({
      label: 'Assigned to you',
      relativeCreatedAt: '2 hours ago',
      entityHref: '/my-tasks?task=task-1234',
      isRead: false
    });
  });
});
