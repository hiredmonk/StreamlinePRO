import type { ActionResult } from '@/lib/actions/types';

export interface BoardOrderVersion {
  projectId: string;
  statusId: string;
  version: number;
}

export interface MoveTaskWithConcurrencyInput {
  taskId: string;
  projectId: string;
  fromStatusId: string;
  toStatusId: string;
  toSectionId?: string | null;
  targetIndex: number;
  expectedLaneVersion: number;
  actorUserId: string;
}

export interface ReorderBoardColumnInput {
  projectId: string;
  statusId: string;
  orderedTaskIds: string[];
  expectedLaneVersion: number;
  actorUserId: string;
}

export interface FetchBoardOrderStateInput {
  projectId: string;
  statusId?: string;
}

export interface BoardConflictInfo {
  projectId: string;
  statusId: string;
  expectedVersion: number;
  actualVersion: number;
  reason: 'version_mismatch' | 'duplicate_sort_order' | 'missing_task' | 'invalid_lane';
}

export interface MoveTaskWithConcurrencyOutput {
  taskId: string;
  projectId: string;
  statusId: string;
  sectionId: string | null;
  sortOrder: number;
  laneVersion: number;
  conflict?: BoardConflictInfo;
}

export interface ReorderBoardColumnOutput {
  projectId: string;
  statusId: string;
  laneVersion: number;
  updatedTaskIds: string[];
  conflict?: BoardConflictInfo;
}

export interface BoardOrderState {
  projectId: string;
  statusId: string;
  laneVersion: number;
  orderedTaskIds: string[];
}

export interface FetchBoardOrderStateOutput {
  lanes: BoardOrderState[];
}

export type MoveTaskWithConcurrencyAction = (
  input: MoveTaskWithConcurrencyInput
) => Promise<ActionResult<MoveTaskWithConcurrencyOutput>>;

export type ReorderBoardColumnAction = (
  input: ReorderBoardColumnInput
) => Promise<ActionResult<ReorderBoardColumnOutput>>;

export type FetchBoardOrderStateQuery = (
  input: FetchBoardOrderStateInput
) => Promise<FetchBoardOrderStateOutput>;
