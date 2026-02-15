import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/page';
import { redirect } from 'next/navigation';

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));

describe('HomePage', () => {
  it('redirects root path to my tasks', () => {
    HomePage();
    expect(redirect).toHaveBeenCalledWith('/my-tasks');
  });
});
