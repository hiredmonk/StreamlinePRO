import { describe, expect, it } from 'vitest';
import { cn, toErrorMessage } from '@/lib/utils';

describe('utils', () => {
  it('merges class names and resolves tailwind conflicts', () => {
    expect(cn('px-2 py-2', 'px-4', undefined, false && 'hidden')).toBe('py-2 px-4');
  });

  it('returns message from Error instances', () => {
    expect(toErrorMessage(new Error('boom'))).toBe('boom');
  });

  it('returns generic message for unknown errors', () => {
    expect(toErrorMessage('boom')).toBe('Something went wrong.');
  });
});
