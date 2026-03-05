import type { ActionResult } from '@/lib/actions/types';

export type RecurrenceFrequency = 'daily' | 'weekly' | 'monthly';
export type RecurrenceMode = 'create_on_complete' | 'create_on_schedule';

export interface RecurrencePatternInput {
  frequency: RecurrenceFrequency;
  interval: number;
}

export interface CreateRecurrenceInput {
  workspaceId: string;
  taskId: string;
  pattern: RecurrencePatternInput;
  mode: RecurrenceMode;
  anchorDueAt?: string | null;
  actorUserId: string;
}

export interface UpdateRecurrenceInput {
  recurrenceId: string;
  pattern?: RecurrencePatternInput;
  mode?: RecurrenceMode;
  actorUserId: string;
}

export interface PauseRecurrenceInput {
  recurrenceId: string;
  actorUserId: string;
  reason?: string;
}

export interface ResumeRecurrenceInput {
  recurrenceId: string;
  actorUserId: string;
}

export interface ListRecurrencesInput {
  workspaceId: string;
  includePaused?: boolean;
}

export interface RecurrenceSummary {
  id: string;
  workspaceId: string;
  pattern: RecurrencePatternInput;
  mode: RecurrenceMode;
  nextRunAt: string | null;
  isPaused: boolean;
  linkedTaskIds: string[];
}

export interface CreateRecurrenceOutput {
  recurrence: RecurrenceSummary;
}

export interface UpdateRecurrenceOutput {
  recurrence: RecurrenceSummary;
}

export interface PauseRecurrenceOutput {
  recurrenceId: string;
  isPaused: true;
  pausedAt: string;
}

export interface ResumeRecurrenceOutput {
  recurrenceId: string;
  isPaused: false;
  resumedAt: string;
}

export interface ListRecurrencesOutput {
  recurrences: RecurrenceSummary[];
}

export type CreateRecurrenceAction = (
  input: CreateRecurrenceInput
) => Promise<ActionResult<CreateRecurrenceOutput>>;

export type UpdateRecurrenceAction = (
  input: UpdateRecurrenceInput
) => Promise<ActionResult<UpdateRecurrenceOutput>>;

export type PauseRecurrenceAction = (
  input: PauseRecurrenceInput
) => Promise<ActionResult<PauseRecurrenceOutput>>;

export type ResumeRecurrenceAction = (
  input: ResumeRecurrenceInput
) => Promise<ActionResult<ResumeRecurrenceOutput>>;

export type ListRecurrencesQuery = (
  input: ListRecurrencesInput
) => Promise<ListRecurrencesOutput>;
