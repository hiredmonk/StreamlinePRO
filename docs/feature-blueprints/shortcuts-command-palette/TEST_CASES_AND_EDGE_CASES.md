# Test Cases & Edge Cases — Shortcuts + Command Palette

## A. Domain Layer Tests

**File:** `tests/unit/domain/shortcuts-command-palette.test.ts`
**Source:** `lib/domain/shortcuts-command-palette/index.ts`

### Existing Tests (1–5)

| # | Test Case | Status |
|---|---|---|
| 1 | Resolves project_detail context with bound shortcuts | PASS |
| 2 | Suppresses preventInInputs, keeps palette.toggle in inputs | PASS |
| 3 | Disabled commands searchable but non-executable | PASS |
| 4 | Navigation commands return navigateTo | PASS |
| 5 | Normalizes ctrl/cmd to same combo | PASS |

### New Tests (6–32)

#### Context Resolution (`resolveShortcutContext`)

| # | Test Case | Input | Expected |
|---|---|---|---|
| 6 | `/my-tasks` resolves to `my_tasks` | `'/my-tasks'` | `'my_tasks'` |
| 7 | `/my-tasks/sub` resolves to `my_tasks` | `'/my-tasks/sub'` | `'my_tasks'` |
| 8 | `/projects` resolves to `projects` | `'/projects'` | `'projects'` |
| 9 | `/projects/abc` resolves to `project_detail` | `'/projects/abc'` | `'project_detail'` |
| 10 | `/inbox` resolves to `inbox` | `'/inbox'` | `'inbox'` |
| 11 | `/search` resolves to `search` | `'/search'` | `'search'` |
| 12 | `/unknown` resolves to `global` | `'/unknown'` | `'global'` |
| 13 | `/` resolves to `global` | `'/'` | `'global'` |

#### Shortcut Filtering

| # | Test Case | Category |
|---|---|---|
| 14 | When `isPaletteOpen=true`, only `palette.toggle` is returned | filtering |
| 15 | When `isComposing=true`, empty shortcuts returned regardless of context | filtering |
| 16 | `task.open_drawer` and `task.complete` only active in `my_tasks` and `project_detail` | context-binding |
| 17 | `task.new` and `palette.toggle` active in all 6 contexts | context-binding |

#### Combo Normalization (`normalizeShortcutCombo`)

| # | Test Case | Input | Expected |
|---|---|---|---|
| 18 | Deduplicates repeated modifiers | `'mod+mod+k'` | `'mod+k'` |
| 19 | Orders modifiers canonically | `'shift+mod+k'` | `'mod+shift+k'` |
| 20 | Handles empty string | `''` | `''` |
| 21 | Handles whitespace in tokens | `'mod + k'` | `'mod+k'` |

#### Event Parsing (`toShortcutComboFromKeyboardEvent`)

| # | Test Case | Input | Expected |
|---|---|---|---|
| 22 | Returns null for bare modifier keys | `{ key: 'Control', ctrlKey: true, ... }` | `null` |
| 23 | Normalizes space key | `{ key: ' ', ctrlKey: true, ... }` | `'mod+space'` |
| 24 | Normalizes escape key | `{ key: 'Escape', ... }` | `'esc'` |
| 25 | Alt key produces alt prefix | `{ key: 'p', altKey: true, ... }` | `'alt+p'` |

#### Search (`searchCommandPalette`)

| # | Test Case | Category |
|---|---|---|
| 26 | Returns all commands with empty query | search |
| 27 | Matches across label, keywords, and shortcut | search |
| 28 | Multi-token search requires all tokens to match | search |
| 29 | Respects limit parameter | search |
| 30 | Sorts enabled before disabled, then by category order | search-sorting |

#### Execution (`executeCommand`)

| # | Test Case | Category |
|---|---|---|
| 31 | Returns `handled: false` for unknown commandId | execution |
| 32 | Returns `triggerActionId` for action commands in valid context | execution |

---

## B. Component Tests

**File:** `tests/unit/components/command-center.test.tsx`
**Source:** `app/components/shortcuts/command-center.tsx`

### Existing Tests (1–8)

| # | Test Case | Status |
|---|---|---|
| 1 | Toggle palette with Ctrl+K / Cmd+K | PASS |
| 2 | Opens palette from input focus (preventInInputs: false) | PASS |
| 3 | Closes on route change | PASS |
| 4 | Disabled commands shown but non-clickable | PASS |
| 5 | Ctrl+N focuses quick-add, falls back to navigation | PASS |
| 6 | Ctrl+Shift+C targets focused task, not drawer | PASS |
| 7 | Ctrl+Shift+C falls back to drawer complete | PASS |
| 8 | IME composition suppresses shortcuts | PASS |

### New Tests (9–24)

#### Palette Lifecycle

| # | Test Case | Category |
|---|---|---|
| 9 | Escape key closes palette | palette-lifecycle |
| 10 | Clicking backdrop (outside dialog) closes palette | palette-lifecycle |
| 11 | Re-opening palette resets query and activeIndex to fresh state | palette-lifecycle |

#### Palette Navigation

| # | Test Case | Category |
|---|---|---|
| 12 | ArrowDown/ArrowUp navigate items, skipping disabled | palette-navigation |
| 13 | Enter on active enabled item executes command and closes palette | palette-execution |
| 14 | Enter on disabled item does nothing | palette-execution |

#### Palette Search

| # | Test Case | Category |
|---|---|---|
| 15 | Search input filters items in real-time | palette-search |
| 16 | Empty search shows all commands | palette-search |
| 17 | No-match search shows "No commands match" empty state | palette-search |

#### Shortcut Actions

| # | Test Case | Category |
|---|---|---|
| 18 | Ctrl+Shift+O clicks `data-shortcut-open-drawer` on focused task | shortcut-action |
| 19 | Ctrl+Shift+O returns true if drawer is already open (no focused task) | shortcut-action |

#### Display

| # | Test Case | Category |
|---|---|---|
| 20 | `formatShortcut` shows platform-appropriate modifier label | display |
| 21 | Shortcut badge shows "No key" for commands without shortcut | display |
| 22 | Palette items show category label | display |

#### Stress / Edge

| # | Test Case | Category |
|---|---|---|
| 23 | Multiple rapid Ctrl+K toggles don't cause stale state | stress |
| 24 | `compositionstart`/`compositionend` events toggle composing ref correctly | ime |

---

## C. Edge Cases Analysis

| # | Edge Case | Risk | Current Handling |
|---|---|---|---|
| 1 | **SSR: `navigator` undefined** | `formatShortcut` crashes during SSR | `typeof navigator !== 'undefined'` check returns empty string for platform |
| 2 | **Concurrent search race condition** | Stale results overwrite fresh ones | `isCancelled` flag in useEffect cleanup prevents stale updates |
| 3 | **Palette open during route transition** | Stale context executes wrong command | `locationKey` useEffect closes palette on route change |
| 4 | **Double Ctrl+K within single frame** | State toggle cancels itself | React batching handles — `setIsPaletteOpen(prev => !prev)` uses functional update |
| 5 | **contentEditable deep nesting** | `isTextInputLike` misses deeply nested editables | Checked via `closest('[contenteditable]')` — traverses ancestors |
| 6 | **Task row without data-task-id** | `getFocusedTaskRoot` returns null, shortcut no-ops | Correct — returns null, action functions return false |
| 7 | **No quick-add input on page** | `focusQuickAddInput` returns false | Falls back to `router.push('/my-tasks?shortcut=new-task')` |
| 8 | **Board view hidden complete button** | `data-shortcut-complete` in hidden form may be found by `querySelector` before task-specific button | **Potential issue** — `completeFocusedTask()` queries within `focusedTask.querySelector` first, so focused task scoping mitigates this. Only an issue if no task is focused and `querySelector('[data-drawer-task-id] [data-shortcut-complete]')` runs. Board hidden buttons are NOT inside `[data-drawer-task-id]`, so no collision. |
| 9 | **Bare modifier key pressed** | `normalizeEventKey` returns null for Control/Meta/Shift/Alt | Correct — `toShortcutComboFromKeyboardEvent` returns null |
| 10 | **Non-ASCII keys (CJK input)** | IME composing triggers shortcuts | `isComposing` check suppresses all shortcuts during IME composition |
| 11 | **Multiple tasks focused** | `closest('[data-task-id]')` returns wrong task | Only one element can have focus; `closest` returns nearest ancestor — correct |
| 12 | **Palette open + another shortcut** | Unintended action during palette use | `isPaletteOpen` filter returns only `palette.toggle` when palette is open |
| 13 | **Tab key in palette** | Focus escapes dialog | **Gap** — no focus trap implemented. Focus can tab out of palette dialog |
| 14 | **Screen reader announcement** | Search results not announced | Dialog has `aria-modal` and `aria-label`. No live region for result count changes |
| 15 | **`userAgentData` API** | Future deprecation of `navigator.platform` | Uses `navigator.userAgentData?.platform` with `navigator.platform` fallback |
| 16 | **Board view: scoped querySelector** | `completeFocusedTask` uses scoped query on focused task root | The focused task root (`[data-task-id]`) in board-view is the `<li>` card which CONTAINS the hidden form, so `focusedTask.querySelector('[data-shortcut-complete]')` correctly finds the card's own hidden complete button. No cross-card collision. |

### Board View Hidden Complete Button — Detailed Analysis

The board-view renders a hidden `<form>` with `data-shortcut-complete` inside each `<li data-task-id>` card. The shortcut dispatch flow:

1. `completeFocusedTask()` calls `getFocusedTaskRoot()` → returns the `<li data-task-id>` if focus is within a card
2. Queries `focusedTask.querySelector('[data-shortcut-complete]')` → finds the button WITHIN that specific card
3. Falls back to `querySelector('[data-drawer-task-id] [data-shortcut-complete]')` only if no focused task

**Verdict:** Not a bug. The scoped `querySelector` on `focusedTask` ensures the correct card's button is targeted. The global fallback only queries inside `[data-drawer-task-id]`, and board hidden forms are not inside drawer elements.
