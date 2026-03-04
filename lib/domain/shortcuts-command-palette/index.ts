import type {
  CommandActionId,
  CommandNavigateTo,
  CommandPaletteItem,
  ExecuteCommand,
  ResolveShortcuts,
  SearchCommandPalette,
  ShortcutContext,
  ShortcutDefinition
} from '@/lib/contracts/shortcuts-command-palette';

type CommandDefinition = Omit<CommandPaletteItem, 'enabled'> & {
  context: ShortcutContext[];
  navigateTo?: CommandNavigateTo;
  triggerActionId?: CommandActionId;
};

const shortcutDefinitions: ShortcutDefinition[] = [
  {
    id: 'palette.toggle',
    combo: 'mod+k',
    description: 'Open command palette',
    context: ['global', 'my_tasks', 'projects', 'project_detail', 'inbox', 'search'],
    preventInInputs: true
  },
  {
    id: 'task.new',
    combo: 'mod+n',
    description: 'Create a new task',
    context: ['global', 'my_tasks', 'projects', 'project_detail', 'inbox', 'search'],
    preventInInputs: true
  },
  {
    id: 'task.open_drawer',
    combo: 'mod+shift+o',
    description: 'Open focused task drawer',
    context: ['my_tasks', 'project_detail'],
    preventInInputs: true
  },
  {
    id: 'task.complete',
    combo: 'mod+shift+c',
    description: 'Complete focused task',
    context: ['my_tasks', 'project_detail'],
    preventInInputs: true
  }
];

const commandDefinitions: CommandDefinition[] = [
  {
    id: 'navigate.my_tasks',
    label: 'Go to My Tasks',
    category: 'navigate',
    keywords: ['my tasks', 'today', 'home', 'tasks'],
    navigateTo: '/my-tasks',
    context: ['global', 'my_tasks', 'projects', 'project_detail', 'inbox', 'search']
  },
  {
    id: 'navigate.projects',
    label: 'Go to Projects',
    category: 'navigate',
    keywords: ['projects', 'workspace', 'board'],
    navigateTo: '/projects',
    context: ['global', 'my_tasks', 'projects', 'project_detail', 'inbox', 'search']
  },
  {
    id: 'navigate.inbox',
    label: 'Go to Inbox',
    category: 'navigate',
    keywords: ['inbox', 'notifications', 'mentions'],
    navigateTo: '/inbox',
    context: ['global', 'my_tasks', 'projects', 'project_detail', 'inbox', 'search']
  },
  {
    id: 'navigate.search',
    label: 'Go to Search',
    category: 'navigate',
    keywords: ['search', 'find', 'lookup'],
    navigateTo: '/search',
    context: ['global', 'my_tasks', 'projects', 'project_detail', 'inbox', 'search']
  },
  {
    id: 'task.new',
    label: 'Create New Task',
    category: 'task',
    keywords: ['new task', 'quick add', 'create task'],
    shortcut: 'mod+n',
    triggerActionId: 'task.new',
    context: ['global', 'my_tasks', 'projects', 'project_detail', 'inbox', 'search']
  },
  {
    id: 'task.open_drawer',
    label: 'Open Focused Task Drawer',
    category: 'task',
    keywords: ['open task', 'task drawer', 'details'],
    shortcut: 'mod+shift+o',
    triggerActionId: 'task.open_drawer',
    context: ['my_tasks', 'project_detail']
  },
  {
    id: 'task.complete',
    label: 'Complete Focused Task',
    category: 'task',
    keywords: ['complete task', 'mark done', 'done'],
    shortcut: 'mod+shift+c',
    triggerActionId: 'task.complete',
    context: ['my_tasks', 'project_detail']
  }
];

const commandById = new Map(commandDefinitions.map((command) => [command.id, command]));

assertNoDuplicateShortcuts(shortcutDefinitions);
assertNoDuplicateCommandIds(commandDefinitions);

export function resolveShortcutContext(pathname: string): ShortcutContext {
  if (pathname.startsWith('/my-tasks')) {
    return 'my_tasks';
  }

  if (pathname.startsWith('/projects/')) {
    return 'project_detail';
  }

  if (pathname.startsWith('/projects')) {
    return 'projects';
  }

  if (pathname.startsWith('/inbox')) {
    return 'inbox';
  }

  if (pathname.startsWith('/search')) {
    return 'search';
  }

  return 'global';
}

export const resolveShortcuts: ResolveShortcuts = (input) => {
  const activeContext = resolveShortcutContext(input.pathname);
  let active = shortcutDefinitions.filter((shortcut) => isShortcutActiveInContext(shortcut.context, activeContext));

  if (input.isPaletteOpen) {
    active = active.filter((shortcut) => shortcut.id === 'palette.toggle');
  }

  if (input.isComposing) {
    active = [];
  }

  if (input.hasTextInputFocus) {
    active = active.filter((shortcut) => !shortcut.preventInInputs);
  }

  return {
    activeContext,
    shortcuts: active.map((shortcut) => ({
      id: shortcut.id,
      combo: shortcut.combo,
      description: shortcut.description
    }))
  };
};

export const searchCommandPalette: SearchCommandPalette = async (input) => {
  const activeContext = resolveShortcutContext(input.pathname);
  const query = input.query.trim().toLowerCase();
  const tokens = query ? query.split(/\s+/).filter(Boolean) : [];
  const limit = normalizeLimit(input.limit);

  const matchedItems = commandDefinitions
    .map((command) => ({
      id: command.id,
      label: command.label,
      category: command.category,
      keywords: command.keywords,
      shortcut: command.shortcut,
      enabled: isShortcutActiveInContext(command.context, activeContext)
    }))
    .filter((command) => matchesTokens(command, tokens))
    .sort(sortCommands);

  return {
    items: matchedItems.slice(0, limit),
    totalMatched: matchedItems.length
  };
};

export const executeCommand: ExecuteCommand = async (input) => {
  const command = commandById.get(input.commandId);
  if (!command) {
    return { commandId: input.commandId, handled: false };
  }

  const activeContext = resolveShortcutContext(input.pathname);
  const enabled = isShortcutActiveInContext(command.context, activeContext);
  if (!enabled) {
    return { commandId: input.commandId, handled: false };
  }

  return {
    commandId: input.commandId,
    handled: true,
    navigateTo: command.navigateTo,
    triggerActionId: command.triggerActionId
  };
};

export function normalizeShortcutCombo(combo: string): string {
  const tokens = combo
    .toLowerCase()
    .split('+')
    .map((token) => token.trim())
    .filter(Boolean);

  const deduped = Array.from(new Set(tokens));
  const modifierOrder = ['mod', 'shift', 'alt'];
  const ordered: string[] = [];

  modifierOrder.forEach((modifier) => {
    if (deduped.includes(modifier)) {
      ordered.push(modifier);
    }
  });

  deduped.forEach((token) => {
    if (!modifierOrder.includes(token)) {
      ordered.push(token);
    }
  });

  return ordered.join('+');
}

export function toShortcutComboFromKeyboardEvent(event: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}): string | null {
  const key = normalizeEventKey(event.key);
  if (!key) {
    return null;
  }

  const comboParts: string[] = [];
  if (event.ctrlKey || event.metaKey) {
    comboParts.push('mod');
  }
  if (event.shiftKey) {
    comboParts.push('shift');
  }
  if (event.altKey) {
    comboParts.push('alt');
  }

  comboParts.push(key);
  return normalizeShortcutCombo(comboParts.join('+'));
}

function normalizeEventKey(key: string): string | null {
  const normalized = key.toLowerCase();
  if (!normalized || normalized === 'control' || normalized === 'meta' || normalized === 'shift' || normalized === 'alt') {
    return null;
  }

  if (normalized === ' ') {
    return 'space';
  }

  if (normalized === 'escape') {
    return 'esc';
  }

  return normalized.length === 1 ? normalized : normalized;
}

function normalizeLimit(limit: number | undefined) {
  if (!limit || Number.isNaN(limit)) {
    return 20;
  }
  return Math.min(Math.max(Math.floor(limit), 1), 100);
}

function matchesTokens(command: CommandPaletteItem, tokens: string[]) {
  if (!tokens.length) {
    return true;
  }

  const text = [
    command.id,
    command.label,
    command.category,
    command.shortcut ?? '',
    ...command.keywords
  ]
    .join(' ')
    .toLowerCase();

  return tokens.every((token) => text.includes(token));
}

function sortCommands(a: CommandPaletteItem, b: CommandPaletteItem) {
  const enabledDelta = Number(b.enabled) - Number(a.enabled);
  if (enabledDelta !== 0) {
    return enabledDelta;
  }

  const categoryOrder: Record<CommandPaletteItem['category'], number> = {
    navigate: 0,
    task: 1,
    project: 2,
    workspace: 3,
    system: 4
  };
  const categoryDelta = categoryOrder[a.category] - categoryOrder[b.category];
  if (categoryDelta !== 0) {
    return categoryDelta;
  }

  return a.label.localeCompare(b.label);
}

function isShortcutActiveInContext(contexts: ShortcutContext[], activeContext: ShortcutContext) {
  return contexts.includes('global') || contexts.includes(activeContext);
}

function assertNoDuplicateShortcuts(definitions: ShortcutDefinition[]) {
  const byId = new Set<string>();
  const byCombo = new Set<string>();

  definitions.forEach((definition) => {
    if (byId.has(definition.id)) {
      throw new Error(`Duplicate shortcut id detected: ${definition.id}`);
    }
    byId.add(definition.id);

    const combo = normalizeShortcutCombo(definition.combo);
    if (byCombo.has(combo)) {
      throw new Error(`Duplicate shortcut combo detected: ${combo}`);
    }
    byCombo.add(combo);
  });
}

function assertNoDuplicateCommandIds(definitions: CommandDefinition[]) {
  const byId = new Set<string>();
  definitions.forEach((definition) => {
    if (byId.has(definition.id)) {
      throw new Error(`Duplicate command id detected: ${definition.id}`);
    }
    byId.add(definition.id);
  });
}
