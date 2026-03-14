# Hooks & Patterns — Shortcuts + Command Palette

## A. Hooks Inventory

### Existing Hooks Reused

| Hook | Source | Role in Feature |
|---|---|---|
| `usePathname()` | `next/navigation` | Determines `ShortcutContext` via `resolveShortcutContext(pathname)` |
| `useSearchParams()` | `next/navigation` | Reads `?workspace=` for context, `?shortcut=new-task` for auto-focus |
| `useRouter().push()` | `next/navigation` | Navigation commands + fallback redirect for `task.new` |

### React Primitives in CommandCenter

| Primitive | Count | Purpose |
|---|---|---|
| `useState` | 4 | `isPaletteOpen`, `query`, `items: CommandPaletteItem[]`, `activeIndex` |
| `useRef` | 2 | `paletteInputRef` (focus management), `isComposingRef` (IME state tracking) |
| `useCallback` | 5 | `closePalette`, `runActionTrigger`, `executeById`, `handlePaletteSelection`, `onPaletteKeyDown` |
| `useEffect` | 4 | Route-change close, auto-focus on open, search debounce, global keydown listener |
| `useMemo` | 1 | `locationKey` — composite key for route-change detection |

### Related Existing Hooks (Not Directly Used)

| Hook | File | Relevance |
|---|---|---|
| `useBoardTasks` | `lib/hooks/use-board-tasks.ts` | Board already has `data-task-id` wiring — shortcuts tap into this DOM |
| `useSidebarNavigationState` | `lib/hooks/use-sidebar-navigation-state.ts` | Could inform context resolution but not currently wired |

---

## B. Existing Patterns Reused

### Server Action Mutation Pattern
`completeTaskFromForm` (from `lib/actions/form-actions.ts`) is the action behind `data-shortcut-complete` buttons. Shortcuts trigger the existing form submit buttons via DOM click, not by calling the action directly.

### Query Param Navigation
- `?task=<id>` opens the task drawer — used by `data-shortcut-open-drawer` links
- `?shortcut=new-task` auto-focuses the quick-add input on `/my-tasks`

### Data-Attribute DOM Targeting
| Attribute | Set By | Read By |
|---|---|---|
| `data-task-id` | `task-row.tsx`, `board-view.tsx` | `getFocusedTaskRoot()` via `closest('[data-task-id]')` |
| `data-shortcut-complete` | `task-row.tsx`, `task-drawer-panel.tsx`, `board-view.tsx` | `completeFocusedTask()` via `querySelector` |
| `data-shortcut-open-drawer` | `task-row.tsx`, `board-view.tsx` | `openFocusedTaskDrawer()` via `querySelector` |
| `data-drawer-task-id` | `task-drawer-panel.tsx` | `openFocusedTaskDrawer()` fallback, `completeFocusedTask()` fallback |
| `data-shortcut-target="new-task-input"` | `quick-add-form.tsx` | `focusQuickAddInput()` via `querySelector` |

### Form Action Submission
Shortcut clicks trigger existing `<form action={completeTaskFromForm}>` submit buttons via DOM `.click()`. This reuses the server action pipeline without bypassing validation.

---

## C. New Patterns Introduced

### 1. Global Keydown Listener with Composition-Aware Suppression
```
window.addEventListener('keydown', onKeyDown)
window.addEventListener('compositionstart', ...)
window.addEventListener('compositionend', ...)
```
The `isComposingRef` tracks IME state. Both `isComposingRef.current` and `event.isComposing` are checked to cover edge cases where the ref and event disagree.

### 2. Combo Normalization (`mod+k` Abstraction)
`normalizeShortcutCombo()` converts any combo string to canonical form:
- Lowercases all tokens
- Deduplicates repeated modifiers
- Orders: `mod > shift > alt > key`
- `mod` abstracts over `Ctrl` (Windows/Linux) and `Cmd` (macOS)

### 3. Context-Based Shortcut Resolution
```
pathname → resolveShortcutContext() → ShortcutContext
ShortcutContext + input state → resolveShortcuts() → active shortcuts
```
The pipeline: pathname determines context, context filters which shortcuts are active, then input focus / IME / palette state further reduces the set.

### 4. Command Palette Search (Token-Based Matching)
`searchCommandPalette()` splits the query into whitespace-separated tokens. All tokens must match within the concatenated search text (id + label + category + shortcut + keywords). Results are sorted: enabled before disabled, then by category order, then alphabetically.

### 5. Action Trigger Dispatch
When a shortcut or command fires, the execution path is:
```
shortcut pressed → toShortcutComboFromKeyboardEvent()
  → resolveShortcuts() → find matching combo
  → if palette.toggle: toggle state
  → if action shortcut: runActionTrigger() → DOM manipulation
  → if other: executeById() → executeCommand() → navigateTo or triggerActionId
```

DOM action functions (`focusQuickAddInput`, `openFocusedTaskDrawer`, `completeFocusedTask`) return `boolean` to signal success. On failure, `task.new` falls back to router navigation.
