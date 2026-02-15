import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import SignInPage from '@/app/(auth)/signin/page';

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: any) => (
    <a href={String(href)} {...props}>
      {children}
    </a>
  )
}));

describe('SignInPage', () => {
  it('renders heading and oauth CTA', () => {
    render(<SignInPage />);

    expect(screen.getByRole('heading', { name: /Work Clarity/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Continue with Google' })).toHaveAttribute(
      'href',
      '/auth/google'
    );
  });
});
