'use client';

import React from 'react';
import { KanbanColumnItem } from '@/hooks/use-tasks';
import { SortableTaskCard } from './task-card';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface KanbanColumnProps {
  column: KanbanColumnItem;
  onTaskClick: (taskId: string) => void;
  onAddTaskClick?: (statusId: string) => void;
}

export function KanbanColumn({
  column,
  onTaskClick,
  onAddTaskClick,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: {
      type: 'Column',
      column,
    },
  });

  const taskIds = React.useMemo(() => column.tasks.map((t) => t.id), [column.tasks]);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-72 sm:w-80 shrink-0 rounded-xl bg-surface/50 border transition-colors max-h-[calc(100vh-220px)] overflow-hidden shadow-sm ${
        isOver
          ? 'border-primary/50 bg-primary/5 ring-1 ring-primary/20'
          : 'border-border/80'
      }`}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-border bg-surface-elevated/40">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: column.color }}
          />
          <span className="text-xs font-semibold text-foreground truncate">
            {column.name}
          </span>
          <span className="text-[11px] font-mono font-medium text-muted-foreground bg-surface-elevated px-1.5 py-0.2 rounded-md border border-border/50">
            {column.tasks.length}
          </span>
        </div>

        {onAddTaskClick && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onAddTaskClick(column.id)}
            className="w-6 h-6 text-muted-foreground hover:text-foreground"
            title={`Add task to ${column.name}`}
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>

      {/* Column Tasks List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5 min-h-[120px]">
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {column.tasks.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center p-4 text-center rounded-lg border border-dashed border-border/60 bg-background/30 text-muted-foreground">
              <p className="text-xs italic">No tasks in this stage</p>
              {onAddTaskClick && (
                <button
                  type="button"
                  onClick={() => onAddTaskClick(column.id)}
                  className="mt-2 text-[11px] text-primary hover:underline flex items-center gap-1 font-medium"
                >
                  <Plus className="w-3 h-3" />
                  <span>Add a task</span>
                </button>
              )}
            </div>
          ) : (
            column.tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task.id)}
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  );
}
