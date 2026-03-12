import { describe, expect, it } from 'vitest';
import { getFallbackStatusOptions, swapStatusOrder } from '@/lib/view-models/workflow-statuses';

describe('workflow-status helpers', () => {
  it('reorders statuses by offset', () => {
    expect(
      swapStatusOrder(
        [
          { id: 'todo' },
          { id: 'doing' },
          { id: 'done' }
        ],
        1,
        -1
      )
    ).toEqual(['doing', 'todo', 'done']);
  });

  it('builds fallback labels excluding the current status', () => {
    expect(
      getFallbackStatusOptions(
        [
          { id: 'todo', name: 'To do' },
          { id: 'done', name: 'Done' }
        ],
        'todo'
      )
    ).toEqual([{ id: 'done', label: 'Move tasks to Done' }]);
  });
});
