import { describe, expect, it } from 'vitest';
import { markNotificationReadSchema } from '@/lib/validators/inbox';

describe('inbox validators', () => {
  it('accepts UUID notification id', () => {
    const parsed = markNotificationReadSchema.parse({
      id: '11111111-1111-4111-8111-111111111111'
    });

    expect(parsed.id).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('rejects invalid notification id', () => {
    const result = markNotificationReadSchema.safeParse({ id: 'abc' });
    expect(result.success).toBe(false);
  });
});
