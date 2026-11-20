'use client';

import React from 'react';
import { Search, X, RotateCcw } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { useProjectMembers } from '../../hooks/use-project';
import { useProjectLabels } from '../../hooks/use-tasks';

export interface BoardFilters {
  search: string;
  priority: string;
  assigneeId: string;
  labelId: string;
  dueDateStatus: string;
}

export const DEFAULT_BOARD_FILTERS: BoardFilters = {
  search: '',
  priority: 'ALL',
  assigneeId: 'ALL',
  labelId: 'ALL',
  dueDateStatus: 'ALL',
};

export interface BoardFilterBarProps {
  projectId: string;
  filters: BoardFilters;
  onChange: (filters: BoardFilters) => void;
  onReset: () => void;
  className?: string;
}

export function BoardFilterBar({
  projectId,
  filters,
  onChange,
  onReset,
  className = '',
}: BoardFilterBarProps) {
  const { data: members = [] } = useProjectMembers(projectId);
  const { data: labels = [] } = useProjectLabels(projectId);

  const activeCount =
    (filters.search.trim() ? 1 : 0) +
    (filters.priority !== 'ALL' ? 1 : 0) +
    (filters.assigneeId !== 'ALL' ? 1 : 0) +
    (filters.labelId !== 'ALL' ? 1 : 0) +
    (filters.dueDateStatus !== 'ALL' ? 1 : 0);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, search: e.target.value });
  };

  const handleClearSearch = () => {
    onChange({ ...filters, search: '' });
  };

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {/* Search Input */}
      <div className="relative w-44 sm:w-56">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={filters.search}
          onChange={handleSearchChange}
          className="h-8 pl-8 pr-7 text-xs bg-background"
        />
        {filters.search && (
          <button
            type="button"
            onClick={handleClearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Priority Filter */}
      <select
        value={filters.priority}
        onChange={(e) => onChange({ ...filters, priority: e.target.value })}
        className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="ALL">All Priorities</option>
        <option value="URGENT">Urgent</option>
        <option value="HIGH">High</option>
        <option value="MEDIUM">Medium</option>
        <option value="LOW">Low</option>
      </select>

      {/* Assignee Filter */}
      <select
        value={filters.assigneeId}
        onChange={(e) => onChange({ ...filters, assigneeId: e.target.value })}
        className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="ALL">All Assignees</option>
        <option value="UNASSIGNED">Unassigned</option>
        {members.map((m) => (
          <option key={m.userId} value={m.userId}>
            {m.user?.name || m.userId}
          </option>
        ))}
      </select>

      {/* Label Filter */}
      <select
        value={filters.labelId}
        onChange={(e) => onChange({ ...filters, labelId: e.target.value })}
        className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="ALL">All Labels</option>
        {labels.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>

      {/* Due Date Filter */}
      <select
        value={filters.dueDateStatus}
        onChange={(e) => onChange({ ...filters, dueDateStatus: e.target.value })}
        className="h-8 rounded-md border border-border bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="ALL">All Due Dates</option>
        <option value="OVERDUE">Overdue</option>
        <option value="TODAY">Due Today</option>
        <option value="THIS_WEEK">Due This Week</option>
        <option value="NO_DUE_DATE">No Due Date</option>
      </select>

      {/* Active Count & Reset Button */}
      {activeCount > 0 && (
        <div className="flex items-center gap-1.5 ml-auto sm:ml-0">
          <Badge
            variant="outline"
            className="text-[11px] h-6 px-2 bg-primary/10 text-primary border-primary/20"
          >
            {activeCount} active
          </Badge>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </Button>
        </div>
      )}
    </div>
  );
}
