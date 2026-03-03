export type ShortcutContext =
  | 'global'
  | 'my_tasks'
  | 'projects'
  | 'project_detail'
  | 'inbox'
  | 'search';

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

export interface ResolvedShortcut {
  id: string;
  combo: string;
  description: string;
}

export interface ResolveShortcutsOutput {
  activeContext: ShortcutContext;
  shortcuts: ResolvedShortcut[];
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

export interface SearchCommandPaletteOutput {
  items: CommandPaletteItem[];
  totalMatched: number;
}

export interface ExecuteCommandInput {
  commandId: string;
  pathname: string;
  activeWorkspaceId?: string | null;
}

export interface ExecuteCommandOutput {
  commandId: string;
  handled: boolean;
  navigateTo?: string;
  triggerActionId?: string;
}

export type ResolveShortcuts = (input: ResolveShortcutsInput) => ResolveShortcutsOutput;

export type SearchCommandPalette = (
  input: SearchCommandPaletteInput
) => Promise<SearchCommandPaletteOutput>;

export type ExecuteCommand = (
  input: ExecuteCommandInput
) => Promise<ExecuteCommandOutput>;
