export const DEFAULT_PROJECT_STATUSES = [
  { name: 'To do', color: '#6e7781', is_done: false },
  { name: 'Doing', color: '#1565c0', is_done: false },
  { name: 'Waiting', color: '#b66a00', is_done: false },
  { name: 'Done', color: '#1b7f4b', is_done: true }
] as const;

export const DEFAULT_PROJECT_SECTIONS = ['Backlog', 'This Week', 'In Review'] as const;

export const STATUS_BADGE_TONE: Record<string, string> = {
  'To do': 'text-slate-700 bg-slate-100 border-slate-300',
  Doing: 'text-blue-700 bg-blue-100 border-blue-300',
  Waiting: 'text-amber-700 bg-amber-100 border-amber-300',
  Done: 'text-emerald-700 bg-emerald-100 border-emerald-300'
};
