import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/app/components/ui/button';

describe('Button component', () => {
  it('defaults type to button', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('applies tone and size variants', () => {
    render(
      <Button tone="danger" size="sm">
        Delete
      </Button>
    );

    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button.className).toContain('text-xs');
    expect(button.className).toContain('border-[#cf7670]');
  });
});
