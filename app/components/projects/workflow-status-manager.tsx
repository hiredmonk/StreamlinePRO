import { Button } from '@/app/components/ui/button';
import {
  createProjectStatusFromForm,
  deleteProjectStatusFromForm,
  reorderProjectStatusesFromForm,
  updateProjectStatusFromForm
} from '@/lib/actions/form-actions';

type WorkflowStatusManagerProps = {
  projectId: string;
  statuses: Array<{
    id: string;
    name: string;
    color: string;
    is_done: boolean;
  }>;
};

export function WorkflowStatusManager({ projectId, statuses }: WorkflowStatusManagerProps) {
  return (
    <section className="glass-panel space-y-4 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#6f675d]">Workflow settings</p>
        <h2 className="text-2xl font-semibold text-[#1f241f]" style={{ fontFamily: 'var(--font-display)' }}>
          Status lanes
        </h2>
        <p className="mt-1 text-sm text-[#5d635e]">
          Add lanes that match your team. Done lanes are completion targets and must keep at least one option.
        </p>
        <p className="mt-1 text-xs text-[#777a75]">
          Tip: deleting a lane safely moves its tasks into the fallback lane you choose.
        </p>
      </div>

      <form action={createProjectStatusFromForm} className="grid gap-2 rounded-xl border border-[#e2d8c2] bg-[#fff9ee] p-3 md:grid-cols-[1.4fr_120px_auto_auto] md:items-center">
        <input type="hidden" name="projectId" value={projectId} />
        <input
          required
          name="name"
          placeholder="Add status (e.g. Blocked)"
          className="h-10 rounded-lg border border-[#d8ccb3] bg-white px-3 text-sm"
        />
        <input
          name="color"
          type="color"
          defaultValue="#6e7781"
          className="h-10 w-full cursor-pointer rounded-lg border border-[#d8ccb3] bg-white px-1"
        />
        <label className="flex h-10 items-center gap-2 rounded-lg border border-[#d8ccb3] bg-white px-3 text-sm text-[#434944]">
          <input name="isDone" type="checkbox" className="h-4 w-4" />
          Done lane
        </label>
        <Button type="submit" tone="brand">
          Add lane
        </Button>
      </form>

      <div className="space-y-3">
        {statuses.map((status, index) => (
          <div key={status.id} className="space-y-2 rounded-xl border border-[#ddd2bc] bg-[#fffdf8] p-3">
            <form
              action={updateProjectStatusFromForm}
              className="grid gap-2 md:grid-cols-[1.4fr_120px_auto_auto] md:items-center"
            >
              <input type="hidden" name="id" value={status.id} />
              <input
                required
                name="name"
                defaultValue={status.name}
                className="h-10 rounded-lg border border-[#d8ccb3] bg-white px-3 text-sm"
              />
              <input
                name="color"
                type="color"
                defaultValue={status.color}
                className="h-10 w-full cursor-pointer rounded-lg border border-[#d8ccb3] bg-white px-1"
              />
              <label className="flex h-10 items-center gap-2 rounded-lg border border-[#d8ccb3] bg-white px-3 text-sm text-[#434944]">
                <input name="isDone" type="checkbox" defaultChecked={status.is_done} className="h-4 w-4" />
                Done lane
              </label>
              <Button type="submit" tone="neutral">
                Save
              </Button>
            </form>

            <div className="flex gap-2">
              <ReorderStatusForm
                projectId={projectId}
                orderedStatusIds={swapStatusOrder(statuses, index, -1)}
                disabled={index === 0}
                label="Move up"
              />
              <ReorderStatusForm
                projectId={projectId}
                orderedStatusIds={swapStatusOrder(statuses, index, 1)}
                disabled={index === statuses.length - 1}
                label="Move down"
              />
            </div>

            {statuses.length > 1 ? (
              <form action={deleteProjectStatusFromForm} className="grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                <input type="hidden" name="id" value={status.id} />
                <select
                  name="fallbackStatusId"
                  defaultValue={statuses.find((option) => option.id !== status.id)?.id}
                  className="h-10 rounded-lg border border-[#d8ccb3] bg-white px-3 text-sm"
                >
                  {statuses
                    .filter((option) => option.id !== status.id)
                    .map((option) => (
                      <option key={option.id} value={option.id}>
                        Move tasks to {option.name}
                      </option>
                    ))}
                </select>
                <Button type="submit" tone="danger">
                  Delete lane
                </Button>
              </form>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function ReorderStatusForm({
  projectId,
  orderedStatusIds,
  disabled,
  label
}: {
  projectId: string;
  orderedStatusIds: string[];
  disabled: boolean;
  label: string;
}) {
  return (
    <form action={reorderProjectStatusesFromForm}>
      <input type="hidden" name="projectId" value={projectId} />
      {orderedStatusIds.map((statusId) => (
        <input key={statusId} type="hidden" name="orderedStatusIds" value={statusId} />
      ))}
      <Button type="submit" tone="ghost" size="sm" disabled={disabled}>
        {label}
      </Button>
    </form>
  );
}

function swapStatusOrder(
  statuses: Array<{ id: string }>,
  index: number,
  offset: -1 | 1
) {
  const target = index + offset;
  if (target < 0 || target >= statuses.length) {
    return statuses.map((status) => status.id);
  }

  const reordered = statuses.map((status) => status.id);
  const [moved] = reordered.splice(index, 1);
  reordered.splice(target, 0, moved);
  return reordered;
}
