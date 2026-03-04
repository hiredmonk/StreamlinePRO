import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { CommandCenter } from '@/app/components/shortcuts/command-center';

const pushMock = vi.fn();
let mockPathname = '/my-tasks';
let mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
  useRouter: () => ({ push: pushMock })
}));

describe('CommandCenter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPathname = '/my-tasks';
    mockSearchParams = new URLSearchParams();
  });

  it('toggles the palette with Ctrl+K and Cmd+K', async () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
    });
  });

  it('suppresses shortcuts while typing in an input', () => {
    render(
      <>
        <CommandCenter />
        <input aria-label="editor" />
      </>
    );

    const input = screen.getByLabelText('editor');
    input.focus();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
  });

  it('closes the palette when route changes', async () => {
    const { rerender } = render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();

    mockPathname = '/projects';
    rerender(<CommandCenter />);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
    });
  });

  it('shows disabled commands in results and prevents execution', async () => {
    mockPathname = '/inbox';
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByPlaceholderText('Type a command or search');
    fireEvent.change(input, { target: { value: 'complete' } });

    const completeButton = await screen.findByRole('button', { name: /Complete Focused Task/i });
    expect(completeButton).toBeDisabled();

    fireEvent.click(completeButton);
    expect(pushMock).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it('runs new-task hotkey by focusing quick add and falls back to navigation', async () => {
    const { unmount } = render(
      <>
        <CommandCenter />
        <input data-shortcut-target="new-task-input" aria-label="quick add" />
      </>
    );

    const quickAdd = screen.getByLabelText('quick add');
    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });

    expect(document.activeElement).toBe(quickAdd);
    expect(pushMock).not.toHaveBeenCalled();

    unmount();

    mockPathname = '/projects';
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/my-tasks?shortcut=new-task');
    });
  });

  it('targets focused task first, then drawer task for complete shortcut', () => {
    const focusedComplete = vi.fn();
    const drawerComplete = vi.fn();

    render(
      <>
        <CommandCenter />
        <div data-task-id="task-focused" tabIndex={0}>
          <button data-shortcut-complete onClick={focusedComplete} type="button">
            Focused complete
          </button>
        </div>
        <div data-drawer-task-id="task-drawer">
          <button data-shortcut-complete onClick={drawerComplete} type="button">
            Drawer complete
          </button>
        </div>
      </>
    );

    const task = document.querySelector('[data-task-id="task-focused"]');
    expect(task).toBeTruthy();
    (task as HTMLElement).focus();

    fireEvent.keyDown(window, { key: 'c', ctrlKey: true, shiftKey: true });

    expect(focusedComplete).toHaveBeenCalledTimes(1);
    expect(drawerComplete).toHaveBeenCalledTimes(0);
  });

  it('falls back to drawer complete when no focused task target exists', () => {
    const drawerComplete = vi.fn();

    render(
      <>
        <CommandCenter />
        <div data-drawer-task-id="task-drawer">
          <button data-shortcut-complete onClick={drawerComplete} type="button">
            Drawer complete
          </button>
        </div>
      </>
    );

    fireEvent.keyDown(window, { key: 'c', ctrlKey: true, shiftKey: true });
    expect(drawerComplete).toHaveBeenCalledTimes(1);
  });

  it('suppresses shortcuts while IME composition is active', () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true, isComposing: true });
    expect(pushMock).not.toHaveBeenCalled();
  });
});

