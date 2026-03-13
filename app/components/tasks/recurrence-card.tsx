import {
  createTaskRecurrenceFromForm,
  updateTaskRecurrenceFromForm,
  pauseTaskRecurrenceFromForm,
  resumeTaskRecurrenceFromForm,
  clearTaskRecurrenceFromForm
} from '@/lib/actions/form-actions';
import { formatRecurrenceSummary } from '@/lib/domain/tasks/format';
import { formatDueDate } from '@/lib/domain/tasks/format';
import type { TaskRecurrenceEditorState } from '@/lib/domain/tasks/recurrence-types';

type RecurrenceCardProps = {
  taskId: string;
  editorState: TaskRecurrenceEditorState;
};

export function RecurrenceCard({ taskId, editorState }: RecurrenceCardProps) {
  if (!editorState.canManage) {
    return (
      <div className="rounded-xl border border-[#ddd2bc] bg-[#fffdf8] p-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Recurrence</h3>
        <p className="mt-1 text-sm text-[#8a8d87]">{editorState.disabledReason}</p>
      </div>
    );
  }

  if (!editorState.summary) {
    return (
      <form action={createTaskRecurrenceFromForm} className="rounded-xl border border-[#ddd2bc] bg-[#fffdf8] p-3">
        <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Recurrence</h3>
        <input type="hidden" name="taskId" value={taskId} />
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <label className="grid gap-1 text-xs text-[#6d6f6c]">
            Frequency
            <select
              name="frequency"
              defaultValue="weekly"
              className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-[#6d6f6c]">
            Interval
            <input
              type="number"
              name="interval"
              defaultValue={1}
              min={1}
              max={365}
              className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3 text-sm"
            />
          </label>
        </div>
        <button
          type="submit"
          className="mt-2 h-9 w-full rounded-lg border border-[#d8caac] bg-[#f8ecd4] text-sm font-semibold text-[#544932] hover:bg-[#f2e3c3]"
        >
          Set recurrence
        </button>
      </form>
    );
  }

  const { summary } = editorState;
  const summaryText = formatRecurrenceSummary(summary.pattern);

  return (
    <div className="rounded-xl border border-[#ddd2bc] bg-[#fffdf8] p-3">
      <h3 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#5d625d]">Recurrence</h3>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-[#d8ccb4] bg-[#fff8ea] px-2 py-1 text-xs font-semibold text-[#645f53]">
          {summaryText}
        </span>
        {summary.isPaused ? (
          <span className="rounded-full border border-[#e1bbb5] bg-[#fff0ee] px-2 py-1 text-xs font-semibold text-[#a13e33]">
            Paused
          </span>
        ) : null}
      </div>

      {summary.nextDueAtPreview ? (
        <p className="mt-1 text-xs text-[#71756f]">
          Next due: {formatDueDate(summary.nextDueAtPreview)}
        </p>
      ) : null}

      <form action={updateTaskRecurrenceFromForm} className="mt-3 grid gap-2 sm:grid-cols-2">
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="recurrenceId" value={summary.recurrenceId} />
        <label className="grid gap-1 text-xs text-[#6d6f6c]">
          Frequency
          <select
            name="frequency"
            defaultValue={summary.pattern.frequency}
            className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="grid gap-1 text-xs text-[#6d6f6c]">
          Interval
          <input
            type="number"
            name="interval"
            defaultValue={summary.pattern.interval}
            min={1}
            max={365}
            className="h-10 rounded-lg border border-[#dccfb8] bg-white px-3 text-sm"
          />
        </label>
        <button
          type="submit"
          className="h-9 rounded-lg border border-[#d6c8aa] bg-[#f7edd8] text-sm font-semibold sm:col-span-2"
        >
          Update recurrence
        </button>
      </form>

      <div className="mt-2 flex gap-2">
        {summary.isPaused ? (
          <form action={resumeTaskRecurrenceFromForm} className="flex-1">
            <input type="hidden" name="taskId" value={taskId} />
            <input type="hidden" name="recurrenceId" value={summary.recurrenceId} />
            <button
              type="submit"
              className="h-9 w-full rounded-lg border border-[#b7ccb2] bg-[#ebf7ec] text-sm font-semibold text-[#1f6a39] hover:bg-[#dff2e2]"
            >
              Resume
            </button>
          </form>
        ) : (
          <form action={pauseTaskRecurrenceFromForm} className="flex-1">
            <input type="hidden" name="taskId" value={taskId} />
            <input type="hidden" name="recurrenceId" value={summary.recurrenceId} />
            <button
              type="submit"
              className="h-9 w-full rounded-lg border border-[#e1bbb5] bg-[#fff0ee] text-sm font-semibold text-[#a13e33] hover:bg-[#fde5e2]"
            >
              Pause
            </button>
          </form>
        )}

        <form action={clearTaskRecurrenceFromForm} className="flex-1">
          <input type="hidden" name="taskId" value={taskId} />
          <input type="hidden" name="recurrenceId" value={summary.recurrenceId} />
          <button
            type="submit"
            className="h-9 w-full rounded-lg border border-[#d8ccb4] bg-white text-sm font-semibold text-[#5c615b] hover:bg-[#f5f0e6]"
          >
            Remove
          </button>
        </form>
      </div>
    </div>
  );
}
