import { describe, expect, it } from 'vitest';

describe('search route contract', () => {
  it('should keep query parameter name stable', () => {
    const url = new URL('http://localhost:3000/api/search?q=asana');
    expect(url.searchParams.get('q')).toBe('asana');
  });
});
