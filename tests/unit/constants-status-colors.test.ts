import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PROJECT_SECTIONS,
  DEFAULT_PROJECT_STATUSES,
  STATUS_BADGE_TONE
} from '@/lib/constants/status-colors';

describe('status constants', () => {
  it('defines default statuses with a done lane', () => {
    expect(DEFAULT_PROJECT_STATUSES.map((status) => status.name)).toEqual([
      'To do',
      'Doing',
      'Waiting',
      'Done'
    ]);
    expect(DEFAULT_PROJECT_STATUSES.some((status) => status.is_done)).toBe(true);
  });

  it('defines default sections', () => {
    expect(DEFAULT_PROJECT_SECTIONS).toEqual(['Backlog', 'This Week', 'In Review']);
  });

  it('contains badge tone mapping for core status names', () => {
    expect(STATUS_BADGE_TONE['To do']).toContain('text-slate-700');
    expect(STATUS_BADGE_TONE.Done).toContain('text-emerald-700');
  });
});
