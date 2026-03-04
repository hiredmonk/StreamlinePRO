# Shortcuts + Command Palette - FEATURE_BLUEPRINT

## Pattern Map
| Concern | Existing Pattern | Source File(s) | Reuse Decision |
|---|---|---|---|
| Navigation primitives | Route-driven navigation with sidebar/nav item model | `app/components/layout/app-sidebar.tsx` | Reuse route labels and destinations in command entries |
| UI action entry points | Form actions and direct action calls from components | `lib/actions/form-actions.ts`, `app/components/projects/board-view.tsx` | Reuse action invocation style from command execution handlers |
| Stateful client components | Client state with hooks and optimistic transitions | `app/components/projects/board-view.tsx` | Reuse hook composition for shortcut + palette controllers |
| Search endpoint pattern | Query routes with validated query params and grouped results | `app/api/search/route.ts`, `app/(app)/search/page.tsx` | Reuse command filtering contract style |
| Reusable UI primitives | Shared button/badge/empty-state patterns | `app/components/ui/button.tsx`, `app/components/ui/empty-state.tsx` | Reuse for palette row/action rendering |
| Testing style for interaction | RTL + Vitest event-driven interaction tests | `tests/unit/components/board-view.test.tsx`, `tests/unit/components/app-sidebar.test.tsx` | Reuse for keyboard and focus behavior tests |
| App shell scope | Global authenticated app layout for cross-page controls | `app/(app)/layout.tsx` | Attach global shortcut listener/palette host at app-shell level |

## Interface (Engineering Drawings)
These interfaces are the engineering drawings for keyboard shortcuts and command palette behavior.

## Feature List
- Keyboard shortcut system
- Command palette (`Ctrl/Cmd + K`)

### Input Types
```ts
export type ShortcutContext = 'global' | 'my_tasks' | 'projects' | 'project_detail' | 'inbox' | 'search';

export interface ShortcutDefinition {
  id: string;
  combo: string;
  description: string;
  context: ShortcutContext[];
  preventInInputs?: boolean;
}

export interface ResolveShortcutsInput {
  pathname: string;
  isPaletteOpen: boolean;
  hasTextInputFocus: boolean;
  isComposing: boolean;
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  category: 'navigate' | 'task' | 'project' | 'workspace' | 'system';
  keywords: string[];
  shortcut?: string;
  enabled: boolean;
}

export interface SearchCommandPaletteInput {
  query: string;
  pathname: string;
  activeWorkspaceId?: string | null;
  limit?: number;
}

export interface ExecuteCommandInput {
  commandId: string;
  pathname: string;
  activeWorkspaceId?: string | null;
}
```

### Output Types
```ts
export interface ResolvedShortcut {
  id: string;
  combo: string;
  description: string;
}

export interface ResolveShortcutsOutput {
  activeContext: ShortcutContext;
  shortcuts: ResolvedShortcut[];
}

export interface SearchCommandPaletteOutput {
  items: CommandPaletteItem[];
  totalMatched: number;
}

export interface ExecuteCommandOutput {
  commandId: string;
  handled: boolean;
  navigateTo?: string;
  triggerActionId?: string;
}
```

### Function Signatures
```ts
export type ResolveShortcuts = (
  input: ResolveShortcutsInput
) => ResolveShortcutsOutput;

export type SearchCommandPalette = (
  input: SearchCommandPaletteInput
) => Promise<SearchCommandPaletteOutput>;

export type ExecuteCommand = (
  input: ExecuteCommandInput
) => Promise<ExecuteCommandOutput>;
```

## Edge Cases
- `Ctrl+K` on Windows/Linux and `Cmd+K` on macOS should map to the same open-palette action.
- Shortcut suppression when cursor is in `input`, `textarea`, or `contenteditable` regions.
- IME composition state must not trigger shortcut dispatch.
- Duplicate command ids or duplicate shortcut combos.
- Route transition while palette is open should not execute stale command context.
- Disabled commands should remain searchable but non-executable.

## Out of Scope (No Logic Yet)
- Actual keyboard event listener implementation.
- Command ranking/fuzzy algorithm implementation.
- Visual implementation of palette modal and motion behavior.
