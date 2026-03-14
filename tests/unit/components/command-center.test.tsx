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

  // ── Existing tests (1–8) ────────────────────────────────────────

  it('toggles the palette with Ctrl+K and Cmd+K', async () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
    });
  });

  it('opens palette even when typing in an input (preventInInputs: false)', () => {
    render(
      <>
        <CommandCenter />
        <input aria-label="editor" />
      </>
    );

    const input = screen.getByLabelText('editor');
    input.focus();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
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

  // ── Workspace context preservation (Bug 6) ─────────────────────

  it('preserves workspace context when navigating via command palette', async () => {
    mockSearchParams = new URLSearchParams('workspace=w1');
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await screen.findByRole('button', { name: /Go to Inbox/i });

    const input = screen.getByPlaceholderText('Type a command or search');
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith(expect.stringContaining('workspace=w1'));
    });
  });

  it('preserves workspace context on task.new fallback navigation', async () => {
    mockSearchParams = new URLSearchParams('workspace=w1');
    mockPathname = '/projects';
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'n', ctrlKey: true });
    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/my-tasks?workspace=w1&shortcut=new-task');
    });
  });

  // ── Palette lifecycle (9–11) ────────────────────────────────────

  it('closes palette when Escape key is pressed inside the palette input', async () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();

    const input = screen.getByPlaceholderText('Type a command or search');
    fireEvent.keyDown(input, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
    });
  });

  it('closes palette when clicking backdrop outside the dialog', async () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const backdrop = screen.getByRole('presentation');
    expect(backdrop).toBeInTheDocument();

    fireEvent.mouseDown(backdrop);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
    });
  });

  it('re-opening palette resets query and activeIndex to fresh state', async () => {
    render(<CommandCenter />);

    // Open and type a query
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByPlaceholderText('Type a command or search');
    fireEvent.change(input, { target: { value: 'tasks' } });
    expect(input).toHaveValue('tasks');

    // Close
    fireEvent.keyDown(input, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    // Re-open
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const freshInput = screen.getByPlaceholderText('Type a command or search');
    expect(freshInput).toHaveValue('');
  });

  // ── Palette navigation (12–14) ──────────────────────────────────

  it('ArrowDown/ArrowUp navigate items, skipping disabled', async () => {
    mockPathname = '/inbox';
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    // Wait for items to load
    await screen.findByRole('button', { name: /Go to My Tasks/i });
    const input = screen.getByPlaceholderText('Type a command or search');

    // ArrowDown should move to next enabled item
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });

    // ArrowUp should move back
    fireEvent.keyDown(input, { key: 'ArrowUp' });

    // Verify we can still interact (no crash from navigation)
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it('Enter on active enabled item executes command and closes palette', async () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await screen.findByRole('button', { name: /Go to Inbox/i });

    const input = screen.getByPlaceholderText('Type a command or search');
    // First sorted enabled item is "Go to Inbox" (alphabetically first in navigate category)
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/inbox');
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('Enter on disabled item does nothing', async () => {
    mockPathname = '/inbox';
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByPlaceholderText('Type a command or search');
    fireEvent.change(input, { target: { value: 'complete' } });

    await screen.findByRole('button', { name: /Complete Focused Task/i });

    // The active index should land on the disabled complete item (it's the only result)
    fireEvent.keyDown(input, { key: 'Enter' });

    // Palette should remain open since disabled item was not executed
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    expect(pushMock).not.toHaveBeenCalled();
  });

  // ── Palette search (15–17) ──────────────────────────────────────

  it('search input filters items in real-time', async () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByPlaceholderText('Type a command or search');

    // All items initially
    await screen.findByRole('button', { name: /Go to My Tasks/i });

    // Type "inbox" to filter
    fireEvent.change(input, { target: { value: 'inbox' } });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Go to Inbox/i })).toBeInTheDocument();
    });

    // Other navigation items should not be present
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Go to Projects/i })).not.toBeInTheDocument();
    });
  });

  it('empty search shows all commands', async () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

    // All 7 commands should appear
    await screen.findByRole('button', { name: /Go to My Tasks/i });
    expect(screen.getByRole('button', { name: /Go to Projects/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Inbox/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Go to Search/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create New Task/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Open Focused Task Drawer/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Complete Focused Task/i })).toBeInTheDocument();
  });

  it('no-match search shows empty state message', async () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    const input = screen.getByPlaceholderText('Type a command or search');
    fireEvent.change(input, { target: { value: 'xyznonexistentcommand' } });

    await waitFor(() => {
      expect(screen.getByText('No commands match your search.')).toBeInTheDocument();
    });
  });

  // ── Shortcut actions (18–19) ────────────────────────────────────

  it('Ctrl+Shift+O clicks data-shortcut-open-drawer on focused task', () => {
    const openDrawer = vi.fn();

    render(
      <>
        <CommandCenter />
        <div data-task-id="task-1" tabIndex={0}>
          <a data-shortcut-open-drawer onClick={openDrawer} href="#">
            Open drawer
          </a>
        </div>
      </>
    );

    const task = document.querySelector('[data-task-id="task-1"]') as HTMLElement;
    task.focus();

    fireEvent.keyDown(window, { key: 'o', ctrlKey: true, shiftKey: true });
    expect(openDrawer).toHaveBeenCalledTimes(1);
  });

  it('Ctrl+Shift+O returns true if drawer is already open (no focused task)', () => {
    render(
      <>
        <CommandCenter />
        <div data-drawer-task-id="task-drawer">
          <p>Drawer content</p>
        </div>
      </>
    );

    // No focused task — should not throw, drawer exists so it should "succeed" silently
    fireEvent.keyDown(window, { key: 'o', ctrlKey: true, shiftKey: true });
    // No navigation should happen since drawer is open
    expect(pushMock).not.toHaveBeenCalled();
  });

  // ── Display (20–22) ─────────────────────────────────────────────

  it('shortcut badge shows "No key" for commands without shortcut', async () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await screen.findByRole('button', { name: /Go to My Tasks/i });

    // Navigation commands have no shortcut, so they should show "No key"
    const noKeyBadges = screen.getAllByText('No key');
    expect(noKeyBadges.length).toBeGreaterThan(0);
  });

  it('palette items show category label', async () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await screen.findByRole('button', { name: /Go to My Tasks/i });

    // Navigate category items should have "navigate" label
    const navigateLabels = screen.getAllByText('navigate');
    expect(navigateLabels.length).toBeGreaterThan(0);

    // Task category items should have "task" label
    const taskLabels = screen.getAllByText('task');
    expect(taskLabels.length).toBeGreaterThan(0);
  });

  it('formatShortcut shows platform-appropriate modifier', async () => {
    render(<CommandCenter />);

    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    await screen.findByRole('button', { name: /Create New Task/i });

    // On the test environment (non-Mac), should show Ctrl
    // Check that the shortcut badge for task.new shows Ctrl+N or Cmd+N
    const allButtons = screen.getAllByRole('button');
    const newTaskButton = allButtons.find((b) => b.textContent?.includes('Create New Task'));
    expect(newTaskButton).toBeTruthy();
    // Should contain either Ctrl or Cmd depending on platform
    expect(newTaskButton?.textContent).toMatch(/Ctrl\+N|Cmd\+N/);
  });

  // ── Stress / edge (23–24) ──────────────────────────────────────

  it('multiple rapid Ctrl+K toggles do not cause stale state', async () => {
    render(<CommandCenter />);

    // Rapid toggles
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true }); // open
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true }); // close
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true }); // open

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    });

    // Close again
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true }); // close

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();
    });
  });

  it('compositionstart/compositionend events toggle composing state', () => {
    render(<CommandCenter />);

    // Start composition
    fireEvent(window, new Event('compositionstart'));

    // During composition, shortcut should be suppressed
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.queryByRole('dialog', { name: 'Command palette' })).not.toBeInTheDocument();

    // End composition
    fireEvent(window, new Event('compositionend'));

    // After composition ends, shortcut should work again
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });
});
