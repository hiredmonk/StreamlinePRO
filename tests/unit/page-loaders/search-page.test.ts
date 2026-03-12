import { describe, expect, it, vi } from 'vitest';
import { groupSearchResultsByProject, loadSearchPageData, searchTasksByTitle } from '@/lib/page-loaders/search-page';
import { requireUser } from '@/lib/auth';

vi.mock('@/lib/auth', () => ({
  requireUser: vi.fn()
}));

describe('loadSearchPageData', () => {
  it('returns an empty result set without querying for blank input', async () => {
    vi.mocked(requireUser).mockResolvedValue({
      supabase: {
        from: vi.fn()
      } as never
    });

    await expect(loadSearchPageData({ q: '   ' })).resolves.toEqual({
      query: '',
      results: [],
      groupedResults: {}
    });
  });
});

describe('searchTasksByTitle', () => {
  it('queries tasks by title and returns normalized rows', async () => {
    const limit = vi.fn(async () => ({
      data: [{ id: 't1', title: 'Write spec', project_id: 'p1', projects: { name: 'Core' } }],
      error: null
    }));
    const order = vi.fn(() => ({ limit }));
    const ilike = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ ilike }));
    const from = vi.fn(() => ({ select }));

    await expect(
      searchTasksByTitle(
        {
          from
        } as never,
        'write'
      )
    ).resolves.toEqual([
      { id: 't1', title: 'Write spec', project_id: 'p1', projects: { name: 'Core' } }
    ]);
    expect(from).toHaveBeenCalledWith('tasks');
  });
});

describe('groupSearchResultsByProject', () => {
  it('groups search rows by project name', () => {
    expect(
      groupSearchResultsByProject([
        { id: 't1', title: 'Write spec', project_id: 'p1', projects: { name: 'Core' } },
        { id: 't2', title: 'Ship docs', project_id: 'p1', projects: { name: 'Core' } }
      ])
    ).toEqual({
      Core: [
        { id: 't1', title: 'Write spec', project_id: 'p1', projects: { name: 'Core' } },
        { id: 't2', title: 'Ship docs', project_id: 'p1', projects: { name: 'Core' } }
      ]
    });
  });
});
