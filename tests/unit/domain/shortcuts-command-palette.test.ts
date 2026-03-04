import { describe, expect, it } from 'vitest';
import {
  executeCommand,
  resolveShortcuts,
  searchCommandPalette,
  toShortcutComboFromKeyboardEvent
} from '@/lib/domain/shortcuts-command-palette';

describe('shortcuts + command palette domain', () => {
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

  it('suppresses shortcuts in text input and during composition', () => {
    const inputSuppressed = resolveShortcuts({
      pathname: '/my-tasks',
      isPaletteOpen: false,
      hasTextInputFocus: true,
      isComposing: false
    });
    expect(inputSuppressed.shortcuts).toEqual([]);

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
});

