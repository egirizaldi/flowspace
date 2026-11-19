'use client';

import React, { useState } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import {
  useKanbanBoard,
  useMoveTask,
  KanbanBoardTaskItem,
  QueryBoardOptions,
} from '@/hooks/use-tasks';
import { calculateNewPosition } from '@/lib/kanban-position';
import { TaskCard } from './task-card';
import { KanbanColumn } from './kanban-column';
import { Loader2, AlertCircle } from 'lucide-react';

interface KanbanBoardProps {
  projectId: string;
  filters?: QueryBoardOptions;
  onTaskClick: (taskId: string) => void;
  onAddTaskClick?: (statusId: string) => void;
}

export function KanbanBoard({
  projectId,
  filters,
  onTaskClick,
  onAddTaskClick,
}: KanbanBoardProps) {
  const { data: board, isLoading, error } = useKanbanBoard(projectId, filters);
  const moveTaskMutation = useMoveTask(projectId);

  const [activeTask, setActiveTask] = useState<KanbanBoardTaskItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Must drag at least 5px to prevent hijacking normal clicks
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = active.data.current?.task as KanbanBoardTaskItem | undefined;
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || !board) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    // Find source column and dragged task
    const sourceColumn = board.columns.find((col) =>
      col.tasks.some((t) => t.id === activeId),
    );
    const draggedTask = sourceColumn?.tasks.find((t) => t.id === activeId);

    if (!sourceColumn || !draggedTask) return;

    // Determine target column (either dropped directly on a column or onto another task)
    let targetColumn = board.columns.find((col) => col.id === overId);
    let targetIndex = -1;

    if (targetColumn) {
      // Dropped on column container
      targetIndex = targetColumn.tasks.length;
    } else {
      // Dropped on another task
      targetColumn = board.columns.find((col) =>
        col.tasks.some((t) => t.id === overId),
      );
      if (targetColumn) {
        targetIndex = targetColumn.tasks.findIndex((t) => t.id === overId);
      }
    }

    if (!targetColumn) return;

    const isSameColumn = sourceColumn.id === targetColumn.id;
    const currentIndex = sourceColumn.tasks.findIndex((t) => t.id === activeId);

    // If dropped at same position in same column, do nothing
    if (isSameColumn && currentIndex === targetIndex) return;

    // Calculate new position
    const tasksInTarget = isSameColumn
      ? targetColumn.tasks.filter((t) => t.id !== activeId)
      : targetColumn.tasks;

    const newPosition = calculateNewPosition(tasksInTarget, targetIndex);

    // Trigger optimistic move
    moveTaskMutation.mutate({
      taskId: draggedTask.id,
      payload: {
        statusId: targetColumn.id,
        position: newPosition,
        version: draggedTask.version,
      },
    });
  };

  if (isLoading) {
    return (
      <div className="h-72 flex items-center justify-center text-muted-foreground">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-xs">Loading board...</p>
        </div>
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="h-64 flex flex-col items-center justify-center p-6 text-center rounded-xl border border-border bg-surface">
        <AlertCircle className="w-8 h-8 text-status-danger mb-2" />
        <p className="text-sm font-semibold text-foreground">Failed to load kanban board</p>
        <p className="text-xs text-muted-foreground mt-1">
          {error instanceof Error ? error.message : 'Please check your connection or permissions.'}
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {moveTaskMutation.error && (
        <div className="mb-3 flex items-center gap-2 p-2.5 bg-status-danger/10 border border-status-danger/30 rounded-lg text-xs text-status-danger">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p>
            Failed to move task: {moveTaskMutation.error.message || 'Version conflict or server error. Position reverted.'}
          </p>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="w-full overflow-x-auto pb-6 pt-1">
          <div className="flex items-start gap-4 min-w-max">
            {board.columns.map((column) => (
              <KanbanColumn
                key={column.id}
                column={column}
                onTaskClick={onTaskClick}
                onAddTaskClick={onAddTaskClick}
              />
            ))}
          </div>
        </div>

        <DragOverlay>
          {activeTask ? (
            <TaskCard task={activeTask} isOverlay />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
