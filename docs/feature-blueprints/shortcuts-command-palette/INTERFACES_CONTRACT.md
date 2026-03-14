# Interfaces Contract — Shortcuts + Command Palette

## Type Contracts

All types live in `lib/contracts/shortcuts-command-palette.ts`. Domain logic in `lib/domain/shortcuts-command-palette/index.ts`.

### Core Types

```
ShortcutContext = 'global' | 'my_tasks' | 'projects' | 'project_detail' | 'inbox' | 'search'
CommandActionId = 'task.new' | 'task.open_drawer' | 'task.complete'
CommandNavigateTo = '/my-tasks' | '/projects' | '/inbox' | '/search'
```

### Internal Types (domain module only)

```ts
type CommandDefinition = Omit<CommandPaletteItem, 'enabled'> & {
  context: ShortcutContext[];
  navigateTo?: CommandNavigateTo;
  triggerActionId?: CommandActionId;
};
```

`CommandDefinition` is the static registry entry. `CommandPaletteItem` is the runtime output with computed `enabled` field.

---

## Data Attribute Contract

### Writers (components that set attributes)

| Component | Attribute | Element | Value |
|---|---|---|---|
| `task-row.tsx` | `data-task-id` | `<article>` | Task ID string |
| `task-row.tsx` | `data-shortcut-open-drawer` | `<a>` (title link) | Present (boolean attribute) |
| `task-row.tsx` | `data-shortcut-complete` | `<button>` in form | Present (boolean attribute) |
| `board-view.tsx` | `data-task-id` | `<li>` (card) | Task ID string |
| `board-view.tsx` | `data-shortcut-open-drawer` | `<a>` (card title) | Present (boolean attribute) |
| `board-view.tsx` | `data-shortcut-complete` | `<button>` in **hidden** form | Present (boolean attribute) |
| `task-drawer-panel.tsx` | `data-drawer-task-id` | `<aside>` | Task ID string |
| `task-drawer-panel.tsx` | `data-shortcut-complete` | `<button>` in form | Present (boolean attribute) |
| `quick-add-form.tsx` | `data-shortcut-target` | `<input>` | `"new-task-input"` |

### Readers (CommandCenter functions that query attributes)

| Function | Selector | Purpose |
|---|---|---|
| `getFocusedTaskRoot()` | `activeElement.closest('[data-task-id]')` | Find task container from focused element |
| `focusQuickAddInput()` | `querySelector('[data-shortcut-target="new-task-input"]')` | Focus the quick-add input |
| `openFocusedTaskDrawer()` | `focusedTask.querySelector('[data-shortcut-open-drawer]')` | Click drawer link on focused task |
| `openFocusedTaskDrawer()` | `querySelector('[data-drawer-task-id]')` | Fallback: check if drawer already open |
| `completeFocusedTask()` | `focusedTask.querySelector('[data-shortcut-complete]')` | Click complete button on focused task |
| `completeFocusedTask()` | `querySelector('[data-drawer-task-id] [data-shortcut-complete]')` | Fallback: complete from drawer |

---

## Component Integration Points

| Component | Modification | Why |
|---|---|---|
| `app/(app)/layout.tsx` | Added `<CommandCenter />` | Global mount point for shortcuts + palette |
| `task-row.tsx` | Added `data-task-id`, `data-shortcut-complete`, `data-shortcut-open-drawer` | Enable shortcut targeting of task rows |
| `task-drawer-panel.tsx` | Added `data-drawer-task-id`, `data-shortcut-complete` | Enable drawer-level shortcut fallback |
| `board-view.tsx` | Added `data-task-id`, `data-shortcut-open-drawer`, hidden `data-shortcut-complete` | Enable shortcuts in board view |
| `quick-add-form.tsx` | Added `data-shortcut-target="new-task-input"` | Enable Ctrl+N focus targeting |
| `my-tasks/page.tsx` | Reads `?shortcut=new-task` search param | Auto-focus quick-add after navigation fallback |

---

## Palette State Machine

```
                   ┌─────────────┐
                   │   CLOSED    │
                   └──────┬──────┘
                          │ Ctrl/Cmd+K
                          ▼
                   ┌─────────────┐
              ┌────│    OPEN     │────┐
              │    └──────┬──────┘    │
              │           │ type      │ Escape / backdrop click /
              │           ▼           │ route change
              │    ┌─────────────┐    │
              │    │  SEARCHING  │────┤
              │    └──────┬──────┘    │
              │           │ Enter     │
              │           ▼           │
              │    ┌─────────────┐    │
              └────│  EXECUTING  │────┘
                   └──────┬──────┘
                          │ command handled
                          ▼
                   ┌─────────────┐
                   │   CLOSED    │
                   └─────────────┘
```

State transitions:
- **CLOSED → OPEN**: `Ctrl/Cmd+K` toggles `isPaletteOpen` to true
- **OPEN → SEARCHING**: User types in input, `query` state updates, `searchCommandPalette` fires
- **SEARCHING → EXECUTING**: Enter pressed on enabled item, `handlePaletteSelection` fires
- **EXECUTING → CLOSED**: `closePalette()` resets all state (`isPaletteOpen=false`, `query=''`, `items=[]`, `activeIndex=0`)
- **Any → CLOSED**: Escape key, backdrop click, route change

---

## Action Dispatch Flow

```
┌──────────────────┐     ┌───────────────────────┐     ┌──────────────────┐
│  KeyboardEvent   │────▶│ toShortcutComboFromKB  │────▶│ resolveShortcuts │
│  (window keydown)│     │ → normalized combo     │     │ → matched shortcut│
└──────────────────┘     └───────────────────────┘     └────────┬─────────┘
                                                                │
                         ┌──────────────────────────────────────┘
                         ▼
              ┌─────────────────────┐
              │  Is palette.toggle? │──Yes──▶ Toggle isPaletteOpen
              └──────────┬──────────┘
                         │ No
                         ▼
              ┌─────────────────────┐
              │  Is action shortcut?│──Yes──▶ runActionTrigger()
              │  (task.new/open/    │        ┌─────────────────────┐
              │   complete)         │        │ DOM action function │
              └──────────┬──────────┘        │ returns boolean     │
                         │ No                └──────────┬──────────┘
                         ▼                              │ false + task.new
              ┌─────────────────────┐                   ▼
              │  executeById()      │        router.push('/my-tasks?shortcut=new-task')
              │  → executeCommand() │
              │  → navigateTo?      │
              └─────────────────────┘
```

---

## Shortcut Definitions Registry

| ID | Combo | Contexts | preventInInputs |
|---|---|---|---|
| `palette.toggle` | `mod+k` | all | `false` |
| `task.new` | `mod+n` | all | `true` |
| `task.open_drawer` | `mod+shift+o` | `my_tasks`, `project_detail` | `true` |
| `task.complete` | `mod+shift+c` | `my_tasks`, `project_detail` | `true` |

## Command Definitions Registry

| ID | Category | Shortcut | Action | Contexts |
|---|---|---|---|---|
| `navigate.my_tasks` | navigate | — | `navigateTo: '/my-tasks'` | all |
| `navigate.projects` | navigate | — | `navigateTo: '/projects'` | all |
| `navigate.inbox` | navigate | — | `navigateTo: '/inbox'` | all |
| `navigate.search` | navigate | — | `navigateTo: '/search'` | all |
| `task.new` | task | `mod+n` | `triggerActionId: 'task.new'` | all |
| `task.open_drawer` | task | `mod+shift+o` | `triggerActionId: 'task.open_drawer'` | `my_tasks`, `project_detail` |
| `task.complete` | task | `mod+shift+c` | `triggerActionId: 'task.complete'` | `my_tasks`, `project_detail` |
