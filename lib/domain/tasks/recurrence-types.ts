export type TaskRecurrencePattern = {
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
};

export type TaskRecurrenceSummary = {
  recurrenceId: string;
  pattern: TaskRecurrencePattern;
  mode: 'create_on_complete';
  isPaused: boolean;
  nextDueAtPreview: string | null;
};

export type TaskRecurrenceEditorState = {
  canManage: boolean;
  disabledReason: string | null;
  summary: TaskRecurrenceSummary | null;
};
