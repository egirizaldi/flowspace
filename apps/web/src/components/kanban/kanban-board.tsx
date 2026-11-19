'use client';

import React from 'react';
import { useKanbanBoard, QueryBoardOptions } from '@/hooks/use-tasks';
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
  );
}
