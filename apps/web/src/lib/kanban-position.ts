/**
 * Calculates a new fractional position for a task moved into a target column.
 * Ensures consistent, monotonic decimal positions.
 */
export function calculateNewPosition(
  tasksInColumn: Array<{ id?: string; position: string | number }>,
  targetIndex: number,
): string {
  if (tasksInColumn.length === 0) {
    return '10000.000000';
  }

  // Dropped at the top (before all items)
  if (targetIndex <= 0) {
    const firstPos = Number(tasksInColumn[0].position);
    const calculated = firstPos / 2;
    return (calculated > 0.000001 ? calculated : firstPos - 1).toFixed(6);
  }

  // Dropped at the bottom (after all items)
  if (targetIndex >= tasksInColumn.length) {
    const lastPos = Number(tasksInColumn[tasksInColumn.length - 1].position);
    return (lastPos + 10000).toFixed(6);
  }

  // Dropped between two items
  const prevPos = Number(tasksInColumn[targetIndex - 1].position);
  const nextPos = Number(tasksInColumn[targetIndex].position);

  // If positions are identical or invalid, create space
  if (prevPos >= nextPos) {
    return (prevPos + 100).toFixed(6);
  }

  return ((prevPos + nextPos) / 2).toFixed(6);
}
