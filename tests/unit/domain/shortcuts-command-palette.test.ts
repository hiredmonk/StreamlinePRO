import { describe, expect, it } from 'vitest';
import {
  executeCommand,
  normalizeShortcutCombo,
  resolveShortcutContext,
  resolveShortcuts,
  searchCommandPalette,
  toShortcutComboFromKeyboardEvent
} from '@/lib/domain/shortcuts-command-palette';

describe('shortcuts + command palette domain', () => {
  // ── Existing tests (1–5) ──────────────────────────────────────────

  it('resolves project detail context and context-bound shortcuts', () => {
    const result = resolveShortcuts({
      pathname: '/projects/project-1',
      isPaletteOpen: false,
      hasTextInputFocus: false,
      isComposing: false
    });

    expect(result.activeContext).toBe('project_detail');
    expect(result.shortcuts.map((shortcut) => shortcut.id)).toEqual(
      expect.arrayContaining(['palette.toggle', 'task.complete', 'task.open_drawer'])
    );
  });

  it('suppresses preventInInputs shortcuts but keeps palette.toggle active in inputs', () => {
    const inputResult = resolveShortcuts({
      pathname: '/my-tasks',
      isPaletteOpen: false,
      hasTextInputFocus: true,
      isComposing: false
    });
    expect(inputResult.shortcuts.map((s) => s.id)).toEqual(['palette.toggle']);

    const compositionSuppressed = resolveShortcuts({
      pathname: '/my-tasks',
      isPaletteOpen: false,
      hasTextInputFocus: false,
      isComposing: true
    });
    expect(compositionSuppressed.shortcuts).toEqual([]);
  });

  it('keeps disabled commands searchable and blocks execution', async () => {
    const search = await searchCommandPalette({
      pathname: '/inbox',
      query: 'complete',
      limit: 10
    });

    expect(search.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'task.complete', enabled: false })
      ])
    );

    const execute = await executeCommand({
      pathname: '/inbox',
      commandId: 'task.complete'
    });
    expect(execute).toEqual({ commandId: 'task.complete', handled: false });
  });

  it('executes navigation commands with navigate target', async () => {
    const result = await executeCommand({
      pathname: '/inbox',
      commandId: 'navigate.my_tasks'
    });

    expect(result).toEqual({
      commandId: 'navigate.my_tasks',
      handled: true,
      navigateTo: '/my-tasks',
      triggerActionId: undefined
    });
  });

  it('normalizes ctrl/cmd hotkeys to the same combo', () => {
    const ctrlCombo = toShortcutComboFromKeyboardEvent({
      key: 'k',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
      altKey: false
    });

    const cmdCombo = toShortcutComboFromKeyboardEvent({
      key: 'k',
      ctrlKey: false,
      metaKey: true,
      shiftKey: false,
      altKey: false
    });

    expect(ctrlCombo).toBe('mod+k');
    expect(cmdCombo).toBe('mod+k');
  });

  // ── Context resolution (6–13) ────────────────────────────────────

  describe('resolveShortcutContext', () => {
    it('/my-tasks resolves to my_tasks', () => {
      expect(resolveShortcutContext('/my-tasks')).toBe('my_tasks');
    });

    it('/my-tasks/sub resolves to my_tasks', () => {
      expect(resolveShortcutContext('/my-tasks/sub')).toBe('my_tasks');
    });

    it('/projects resolves to projects', () => {
      expect(resolveShortcutContext('/projects')).toBe('projects');
    });

    it('/projects/abc resolves to project_detail', () => {
      expect(resolveShortcutContext('/projects/abc')).toBe('project_detail');
    });

    it('/inbox resolves to inbox', () => {
      expect(resolveShortcutContext('/inbox')).toBe('inbox');
    });

    it('/search resolves to search', () => {
      expect(resolveShortcutContext('/search')).toBe('search');
    });

    it('/unknown resolves to global', () => {
      expect(resolveShortcutContext('/unknown')).toBe('global');
    });

    it('/ resolves to global', () => {
      expect(resolveShortcutContext('/')).toBe('global');
    });
  });

  // ── Shortcut filtering (14–17) ───────────────────────────────────

  describe('shortcut filtering', () => {
    it('when isPaletteOpen=true, only palette.toggle is returned', () => {
      const result = resolveShortcuts({
        pathname: '/my-tasks',
        isPaletteOpen: true,
        hasTextInputFocus: false,
        isComposing: false
      });
      expect(result.shortcuts.map((s) => s.id)).toEqual(['palette.toggle']);
    });

    it('when isComposing=true, empty shortcuts returned regardless of context', () => {
      const contexts = ['/my-tasks', '/projects', '/projects/abc', '/inbox', '/search', '/'];
      for (const pathname of contexts) {
        const result = resolveShortcuts({
          pathname,
          isPaletteOpen: false,
          hasTextInputFocus: false,
          isComposing: true
        });
        expect(result.shortcuts).toEqual([]);
      }
    });

    it('task.open_drawer and task.complete only active in my_tasks and project_detail', () => {
      const activeContexts = ['/my-tasks', '/projects/abc'];
      const inactiveContexts = ['/projects', '/inbox', '/search', '/'];

      for (const pathname of activeContexts) {
        const result = resolveShortcuts({
          pathname,
          isPaletteOpen: false,
          hasTextInputFocus: false,
          isComposing: false
        });
        const ids = result.shortcuts.map((s) => s.id);
        expect(ids).toContain('task.open_drawer');
        expect(ids).toContain('task.complete');
      }

      for (const pathname of inactiveContexts) {
        const result = resolveShortcuts({
          pathname,
          isPaletteOpen: false,
          hasTextInputFocus: false,
          isComposing: false
        });
        const ids = result.shortcuts.map((s) => s.id);
        expect(ids).not.toContain('task.open_drawer');
        expect(ids).not.toContain('task.complete');
      }
    });

    it('task.new and palette.toggle active in all contexts', () => {
      const allPathnames = ['/my-tasks', '/projects', '/projects/abc', '/inbox', '/search', '/'];
      for (const pathname of allPathnames) {
        const result = resolveShortcuts({
          pathname,
          isPaletteOpen: false,
          hasTextInputFocus: false,
          isComposing: false
        });
        const ids = result.shortcuts.map((s) => s.id);
        expect(ids).toContain('palette.toggle');
        expect(ids).toContain('task.new');
      }
    });
  });

  // ── Combo normalization (18–21) ──────────────────────────────────

  describe('normalizeShortcutCombo', () => {
    it('deduplicates repeated modifiers', () => {
      expect(normalizeShortcutCombo('mod+mod+k')).toBe('mod+k');
    });

    it('orders modifiers canonically (mod > shift > alt > key)', () => {
      expect(normalizeShortcutCombo('shift+mod+k')).toBe('mod+shift+k');
      expect(normalizeShortcutCombo('alt+shift+mod+k')).toBe('mod+shift+alt+k');
    });

    it('handles empty string', () => {
      expect(normalizeShortcutCombo('')).toBe('');
    });

    it('handles whitespace in tokens', () => {
      expect(normalizeShortcutCombo('mod + k')).toBe('mod+k');
    });
  });

  // ── Event parsing (22–25) ────────────────────────────────────────

  describe('toShortcutComboFromKeyboardEvent', () => {
    it('returns null for bare modifier keys', () => {
      expect(
        toShortcutComboFromKeyboardEvent({
          key: 'Control',
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false
        })
      ).toBeNull();

      expect(
        toShortcutComboFromKeyboardEvent({
          key: 'Meta',
          ctrlKey: false,
          metaKey: true,
          shiftKey: false,
          altKey: false
        })
      ).toBeNull();

      expect(
        toShortcutComboFromKeyboardEvent({
          key: 'Shift',
          ctrlKey: false,
          metaKey: false,
          shiftKey: true,
          altKey: false
        })
      ).toBeNull();

      expect(
        toShortcutComboFromKeyboardEvent({
          key: 'Alt',
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: true
        })
      ).toBeNull();
    });

    it('normalizes space key to mod+space', () => {
      expect(
        toShortcutComboFromKeyboardEvent({
          key: ' ',
          ctrlKey: true,
          metaKey: false,
          shiftKey: false,
          altKey: false
        })
      ).toBe('mod+space');
    });

    it('normalizes escape key to esc', () => {
      expect(
        toShortcutComboFromKeyboardEvent({
          key: 'Escape',
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: false
        })
      ).toBe('esc');
    });

    it('alt key produces alt prefix', () => {
      expect(
        toShortcutComboFromKeyboardEvent({
          key: 'p',
          ctrlKey: false,
          metaKey: false,
          shiftKey: false,
          altKey: true
        })
      ).toBe('alt+p');
    });
  });

  // ── Search (26–30) ───────────────────────────────────────────────

  describe('searchCommandPalette', () => {
    it('returns all commands with empty query', async () => {
      const result = await searchCommandPalette({
        query: '',
        pathname: '/my-tasks'
      });
      expect(result.items.length).toBe(7);
      expect(result.totalMatched).toBe(7);
    });

    it('matches across label, keywords, and shortcut', async () => {
      const byLabel = await searchCommandPalette({
        query: 'Go to My Tasks',
        pathname: '/my-tasks'
      });
      expect(byLabel.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'navigate.my_tasks' })])
      );

      const byKeyword = await searchCommandPalette({
        query: 'notifications',
        pathname: '/my-tasks'
      });
      expect(byKeyword.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'navigate.inbox' })])
      );

      const byShortcut = await searchCommandPalette({
        query: 'mod+n',
        pathname: '/my-tasks'
      });
      expect(byShortcut.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'task.new' })])
      );
    });

    it('multi-token search requires all tokens to match', async () => {
      const result = await searchCommandPalette({
        query: 'go tasks',
        pathname: '/my-tasks'
      });
      expect(result.items).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: 'navigate.my_tasks' })])
      );

      const noMatch = await searchCommandPalette({
        query: 'go xyznonexistent',
        pathname: '/my-tasks'
      });
      expect(noMatch.items).toHaveLength(0);
    });

    it('respects limit parameter', async () => {
      const result = await searchCommandPalette({
        query: '',
        pathname: '/my-tasks',
        limit: 3
      });
      expect(result.items).toHaveLength(3);
      expect(result.totalMatched).toBe(7);
    });

    it('sorts enabled before disabled, then by category order', async () => {
      const result = await searchCommandPalette({
        query: '',
        pathname: '/inbox'
      });

      const enabledItems = result.items.filter((i) => i.enabled);
      const disabledItems = result.items.filter((i) => !i.enabled);

      const firstDisabledIndex = result.items.findIndex((i) => !i.enabled);
      const lastEnabledIndex = result.items.map((i) => i.enabled).lastIndexOf(true);

      if (firstDisabledIndex !== -1 && lastEnabledIndex !== -1) {
        expect(lastEnabledIndex).toBeLessThan(firstDisabledIndex);
      }

      expect(enabledItems.length).toBeGreaterThan(0);
      expect(disabledItems.length).toBeGreaterThan(0);
    });
  });

  // ── Execution (31–32) ────────────────────────────────────────────

  describe('executeCommand', () => {
    it('returns handled: false for unknown commandId', async () => {
      const result = await executeCommand({
        pathname: '/my-tasks',
        commandId: 'nonexistent.command'
      });
      expect(result).toEqual({ commandId: 'nonexistent.command', handled: false });
    });

    it('returns triggerActionId for action commands in valid context', async () => {
      const result = await executeCommand({
        pathname: '/my-tasks',
        commandId: 'task.complete'
      });
      expect(result).toEqual({
        commandId: 'task.complete',
        handled: true,
        navigateTo: undefined,
        triggerActionId: 'task.complete'
      });
    });
  });
});
