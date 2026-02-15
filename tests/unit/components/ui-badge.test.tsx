import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PriorityBadge, StatusBadge } from '@/app/components/ui/badge';

describe('Badge components', () => {
  it('renders status with fallback tone when unknown', () => {
    render(<StatusBadge name="Custom" />);
    const badge = screen.getByText('Custom');

    expect(badge.className).toContain('border-slate-200');
  });

  it('renders priority labels and no-priority fallback', () => {
    const { rerender } = render(<PriorityBadge priority="high" />);
    expect(screen.getByText('high')).toBeInTheDocument();

    rerender(<PriorityBadge priority={null} />);
    expect(screen.getByText('No priority')).toBeInTheDocument();
  });
});
