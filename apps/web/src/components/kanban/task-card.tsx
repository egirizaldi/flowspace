'use client';

import React from 'react';
import { KanbanBoardTaskItem } from '@/hooks/use-tasks';
import { Badge } from '@/components/ui/badge';
import { Calendar, CheckCircle2, MessageSquare, User as UserIcon } from 'lucide-react';
import { TaskPriority } from '@flowspace/shared';

interface TaskCardProps {
  task: KanbanBoardTaskItem;
  onClick?: () => void;
}

export function TaskCard({ task, onClick }: TaskCardProps) {
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="danger" className="text-[9px] px-1.5 py-0 font-medium">Urgent</Badge>;
      case 'HIGH':
        return <Badge variant="warning" className="text-[9px] px-1.5 py-0 font-medium">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="info" className="text-[9px] px-1.5 py-0 font-medium">Medium</Badge>;
      case 'LOW':
      default:
        return <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-medium">Low</Badge>;
    }
  };

  return (
    <div
      onClick={onClick}
      className="group relative flex flex-col gap-2 p-3 rounded-lg border border-border bg-surface hover:bg-surface-elevated/70 hover:border-primary/40 shadow-sm hover:shadow transition-all cursor-pointer select-none"
    >
      {/* Top row: Task Key + Priority */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-semibold text-muted-foreground group-hover:text-primary transition-colors">
          {task.taskKey}
        </span>
        {getPriorityBadge(task.priority)}
      </div>

      {/* Title */}
      <h4 className="text-xs sm:text-sm font-medium text-foreground line-clamp-2 leading-snug">
        {task.title}
      </h4>

      {/* Labels */}
      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-0.5">
          {task.labels.map((label) => (
            <span
              key={label.id}
              className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium border"
              style={{
                backgroundColor: `${label.color}15`,
                borderColor: `${label.color}35`,
                color: label.color,
              }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}

      {/* Footer: Due date, counts & Assignee */}
      <div className="flex items-center justify-between pt-1 border-t border-border/50 text-[11px] text-muted-foreground mt-0.5">
        <div className="flex items-center gap-2.5">
          {task.dueDate && (
            <span className="flex items-center gap-1 font-mono text-[10px]" title={`Due ${new Date(task.dueDate).toLocaleDateString()}`}>
              <Calendar className="w-3 h-3 text-muted-foreground" />
              {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}

          {task._count && task._count.subtasks > 0 && (
            <span className="flex items-center gap-0.5 font-mono text-[10px]" title={`${task._count.subtasks} subtasks`}>
              <CheckCircle2 className="w-3 h-3 text-primary" />
              {task._count.subtasks}
            </span>
          )}

          {task._count && task._count.comments > 0 && (
            <span className="flex items-center gap-0.5 font-mono text-[10px]" title={`${task._count.comments} comments`}>
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              {task._count.comments}
            </span>
          )}
        </div>

        {/* Assignee Avatar */}
        <div>
          {task.assignee ? (
            <div
              className="w-5 h-5 rounded-full bg-primary/10 border border-primary/25 text-primary flex items-center justify-center text-[10px] font-bold"
              title={`Assigned to ${task.assignee.name}`}
            >
              {task.assignee.name.charAt(0).toUpperCase()}
            </div>
          ) : (
            <span title="Unassigned">
              <UserIcon className="w-3.5 h-3.5 text-muted-foreground/35" />
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
