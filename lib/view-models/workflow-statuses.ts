type WorkflowStatus = {
  id: string;
  name: string;
};

export function swapStatusOrder(
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

export function getFallbackStatusOptions(statuses: WorkflowStatus[], statusId: string) {
  return statuses
    .filter((option) => option.id !== statusId)
    .map((option) => ({
      id: option.id,
      label: `Move tasks to ${option.name}`
    }));
}
