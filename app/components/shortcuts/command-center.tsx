'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Route } from 'next';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CommandActionId, CommandPaletteItem } from '@/lib/contracts/shortcuts-command-palette';
import {
  executeCommand,
  normalizeShortcutCombo,
  resolveShortcuts,
  searchCommandPalette,
  toShortcutComboFromKeyboardEvent
} from '@/lib/domain/shortcuts-command-palette';

export function CommandCenter() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const activeWorkspaceId = searchParams.get('workspace');
  const locationKey = useMemo(() => `${pathname}?${searchParams.toString()}`, [pathname, searchParams]);

  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<CommandPaletteItem[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  const isComposingRef = useRef(false);

  const closePalette = useCallback(() => {
    setIsPaletteOpen(false);
    setQuery('');
    setItems([]);
    setActiveIndex(0);
  }, []);

  useEffect(() => {
    closePalette();
  }, [closePalette, locationKey]);

  useEffect(() => {
    if (!isPaletteOpen) {
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      paletteInputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isPaletteOpen]);

  useEffect(() => {
    if (!isPaletteOpen) {
      return;
    }

    let isCancelled = false;
    void searchCommandPalette({
      query,
      pathname,
      activeWorkspaceId,
      limit: 30
    }).then((result) => {
      if (isCancelled) {
        return;
      }

      setItems(result.items);
      const firstEnabled = result.items.findIndex((item) => item.enabled);
      setActiveIndex(firstEnabled === -1 ? 0 : firstEnabled);
    });

    return () => {
      isCancelled = true;
    };
  }, [activeWorkspaceId, isPaletteOpen, pathname, query]);

  const runActionTrigger = useCallback((triggerActionId: CommandActionId) => {
    if (triggerActionId === 'task.new') {
      return focusQuickAddInput();
    }
    if (triggerActionId === 'task.open_drawer') {
      return openFocusedTaskDrawer();
    }
    if (triggerActionId === 'task.complete') {
      return completeFocusedTask();
    }
    return false;
  }, []);

  const executeById = useCallback(
    async (commandId: string) => {
      const result = await executeCommand({
        commandId,
        pathname,
        activeWorkspaceId
      });

      if (!result.handled) {
        return false;
      }

      if (result.triggerActionId) {
        const actionHandled = runActionTrigger(result.triggerActionId);
        if (!actionHandled) {
          if (result.triggerActionId === 'task.new') {
            router.push('/my-tasks?shortcut=new-task' as Route);
            return true;
          }
          return false;
        }
      }

      if (result.navigateTo) {
        router.push(result.navigateTo as Route);
      }

      return true;
    },
    [activeWorkspaceId, pathname, router, runActionTrigger]
  );

  const handlePaletteSelection = useCallback(
    async (commandId: string) => {
      const handled = await executeById(commandId);
      if (handled) {
        closePalette();
      }
    },
    [closePalette, executeById]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const combo = toShortcutComboFromKeyboardEvent(event);
      if (!combo) {
        return;
      }

      const hasTextInputFocus = isTextInputLike(document.activeElement);
      const activeShortcuts = resolveShortcuts({
        pathname,
        isPaletteOpen,
        hasTextInputFocus,
        isComposing: isComposingRef.current || event.isComposing
      });

      const matched = activeShortcuts.shortcuts.find(
        (shortcut) => normalizeShortcutCombo(shortcut.combo) === combo
      );

      if (!matched) {
        return;
      }

      event.preventDefault();

      if (matched.id === 'palette.toggle') {
        setIsPaletteOpen((prev) => !prev);
        return;
      }

      if (isActionShortcutId(matched.id)) {
        const actionHandled = runActionTrigger(matched.id);
        if (!actionHandled && matched.id === 'task.new') {
          router.push('/my-tasks?shortcut=new-task' as Route);
        }
        return;
      }

      void executeById(matched.id);
    };

    const onCompositionStart = () => {
      isComposingRef.current = true;
    };

    const onCompositionEnd = () => {
      isComposingRef.current = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('compositionstart', onCompositionStart);
    window.addEventListener('compositionend', onCompositionEnd);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('compositionstart', onCompositionStart);
      window.removeEventListener('compositionend', onCompositionEnd);
    };
  }, [executeById, isPaletteOpen, pathname, router, runActionTrigger]);

  const onPaletteKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closePalette();
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => getNextEnabledIndex(items, current, 1));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => getNextEnabledIndex(items, current, -1));
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const item = items[activeIndex];
        if (!item || !item.enabled) {
          return;
        }
        void handlePaletteSelection(item.id);
      }
    },
    [activeIndex, closePalette, handlePaletteSelection, items]
  );

  if (!isPaletteOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-[#1f1a14]/35 px-4 py-[12dvh] backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          closePalette();
        }
      }}
    >
      <section
        className="w-full max-w-2xl rounded-2xl border border-[#d7ccb4] bg-[#fffdf8] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
      >
        <div className="border-b border-[#e4d8bf] px-4 py-3">
          <input
            ref={paletteInputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onPaletteKeyDown}
            placeholder="Type a command or search"
            className="h-11 w-full rounded-xl border border-[#dacfb9] bg-white px-3 text-sm outline-none focus:border-[#d37f43]"
          />
        </div>
        <div className="max-h-[52dvh] overflow-y-auto p-2">
          {items.length ? (
            <ul className="space-y-1">
              {items.map((item, index) => (
                <li key={item.id}>
                  <button
                    type="button"
                    disabled={!item.enabled}
                    onClick={() => void handlePaletteSelection(item.id)}
                    className={[
                      'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition',
                      index === activeIndex ? 'bg-[#f7e8ce]' : 'hover:bg-[#fbf1dd]',
                      item.enabled ? 'text-[#273028]' : 'cursor-not-allowed text-[#8c877e]'
                    ].join(' ')}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{item.label}</span>
                      <span className="block text-xs uppercase tracking-[0.12em] text-[#7d766d]">
                        {item.category}
                      </span>
                    </span>
                    <span className="shrink-0 rounded-md border border-[#dccfb4] bg-white px-2 py-1 text-xs font-semibold text-[#4a4f47]">
                      {formatShortcut(item.shortcut)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border border-dashed border-[#d9ceb7] px-3 py-6 text-center text-sm text-[#716d64]">
              No commands match your search.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

function focusQuickAddInput() {
  const input = document.querySelector<HTMLInputElement>('[data-shortcut-target="new-task-input"]');
  if (!input) {
    return false;
  }
  input.focus();
  input.select();
  return true;
}

function openFocusedTaskDrawer() {
  const focusedTask = getFocusedTaskRoot();
  const focusedLink = focusedTask?.querySelector<HTMLElement>('[data-shortcut-open-drawer]');
  if (focusedLink) {
    focusedLink.click();
    return true;
  }

  const drawer = document.querySelector<HTMLElement>('[data-drawer-task-id]');
  return Boolean(drawer);
}

function completeFocusedTask() {
  const focusedTask = getFocusedTaskRoot();
  const focusedComplete = focusedTask?.querySelector<HTMLElement>('[data-shortcut-complete]');
  if (focusedComplete) {
    focusedComplete.click();
    return true;
  }

  const drawerComplete = document.querySelector<HTMLElement>(
    '[data-drawer-task-id] [data-shortcut-complete]'
  );
  if (drawerComplete) {
    drawerComplete.click();
    return true;
  }

  return false;
}

function getFocusedTaskRoot() {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) {
    return null;
  }

  return activeElement.closest<HTMLElement>('[data-task-id]');
}

function isTextInputLike(node: Element | null) {
  if (!(node instanceof HTMLElement)) {
    return false;
  }

  const tagName = node.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea') {
    return true;
  }

  if (node.isContentEditable) {
    return true;
  }

  return Boolean(node.closest('[contenteditable=""], [contenteditable="true"]'));
}

function formatShortcut(shortcut: string | undefined) {
  if (!shortcut) {
    return 'No key';
  }

  const isMac = typeof navigator !== 'undefined' && /mac|iphone|ipad|ipod/i.test(navigator.platform);
  return shortcut
    .split('+')
    .map((part) => {
      if (part === 'mod') {
        return isMac ? 'Cmd' : 'Ctrl';
      }
      if (part === 'shift') {
        return 'Shift';
      }
      return part.length === 1 ? part.toUpperCase() : part;
    })
    .join('+');
}

function isActionShortcutId(id: string): id is CommandActionId {
  return id === 'task.new' || id === 'task.open_drawer' || id === 'task.complete';
}

function getNextEnabledIndex(items: CommandPaletteItem[], current: number, direction: 1 | -1) {
  if (!items.length) {
    return 0;
  }

  for (let offset = 1; offset <= items.length; offset += 1) {
    const nextIndex = (current + direction * offset + items.length) % items.length;
    if (items[nextIndex]?.enabled) {
      return nextIndex;
    }
  }

  return current;
}
