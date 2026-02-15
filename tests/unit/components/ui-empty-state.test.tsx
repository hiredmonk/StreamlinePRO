import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EmptyState } from '@/app/components/ui/empty-state';

describe('EmptyState', () => {
  it('renders title, description, and optional action', () => {
    render(
      <EmptyState
        title="No tasks"
        description="Add one to get started"
        action={<button>Create</button>}
      />
    );

    expect(screen.getByText('No tasks')).toBeInTheDocument();
    expect(screen.getByText('Add one to get started')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });
});
