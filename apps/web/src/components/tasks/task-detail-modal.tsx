'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Trash2,
  Calendar,
  User as UserIcon,
  Tag,
  CheckCircle2,
  Plus,
  Loader2,
  Clock,
  Layers,
  ArrowRight,
  AlertCircle,
  Flag,
} from 'lucide-react';
import {
  useTask,
  useUpdateTask,
  useUpdateTaskStatus,
  useAssignTask,
  useDeleteTask,
  useAttachTaskLabel,
  useDetachTaskLabel,
  useCreateSubtask,
  useProjectLabels,
  useCreateProjectLabel,
  useTaskActivities,
  TaskItem,
} from '@/hooks/use-tasks';
import { TaskPriority } from '@flowspace/shared';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface TaskDetailModalProps {
  taskId: string | null;
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
  statuses?: Array<{ id: string; name: string; color: string; category?: string }>;
  members?: Array<{ userId: string; user: { id: string; name: string; email: string; avatarUrl?: string | null } }>;
  onSelectTask?: (taskId: string) => void;
}

const PRESET_LABEL_COLORS = [
  '#ef4444', // Red
  '#f97316', // Orange
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
];

export function TaskDetailModal({
  taskId,
  projectId,
  isOpen,
  onClose,
  statuses = [],
  members = [],
  onSelectTask,
}: TaskDetailModalProps) {
  const { data: task, isLoading, error } = useTask(taskId);
  const { data: activities = [] } = useTaskActivities(taskId);
  const { data: projectLabels = [] } = useProjectLabels(projectId);

  const updateTask = useUpdateTask(taskId || '', projectId);
  const updateStatus = useUpdateTaskStatus(taskId || '', projectId);
  const assignTask = useAssignTask(taskId || '', projectId);
  const deleteTask = useDeleteTask(taskId || '', projectId);
  const attachLabel = useAttachTaskLabel(taskId || '', projectId);
  const detachLabel = useDetachTaskLabel(taskId || '', projectId);
  const createSubtask = useCreateSubtask(taskId || '', projectId);
  const createLabel = useCreateProjectLabel(projectId);

  // Local state for editing
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDesc, setIsEditingDesc] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState(PRESET_LABEL_COLORS[0]);
  const [isCreatingLabel, setIsCreatingLabel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
    }
  }, [task]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !taskId) return null;

  // Priority color & badge styling
  const getPriorityBadge = (priority: TaskPriority) => {
    switch (priority) {
      case 'URGENT':
        return <Badge variant="danger" className="text-xs">Urgent</Badge>;
      case 'HIGH':
        return <Badge variant="warning" className="text-xs">High</Badge>;
      case 'MEDIUM':
        return <Badge variant="info" className="text-xs">Medium</Badge>;
      case 'LOW':
      default:
        return <Badge variant="secondary" className="text-xs">Low</Badge>;
    }
  };

  const handleTitleSave = async () => {
    if (!task || !title.trim() || title === task.title) {
      setIsEditingTitle(false);
      return;
    }
    setActionError(null);
    try {
      await updateTask.mutateAsync({
        title: title.trim(),
        version: task.version,
      });
      setIsEditingTitle(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update title');
    }
  };

  const handleDescriptionSave = async () => {
    if (!task) return;
    setActionError(null);
    try {
      await updateTask.mutateAsync({
        description: description.trim() || null,
        version: task.version,
      });
      setIsEditingDesc(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update description');
    }
  };

  const handleStatusChange = async (newStatusId: string) => {
    if (!task || newStatusId === task.statusId) return;
    setActionError(null);
    try {
      await updateStatus.mutateAsync({
        statusId: newStatusId,
        version: task.version,
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to update status');
    }
  };

  const handlePriorityChange = async (newPriority: TaskPriority) => {
    if (!task || newPriority === task.priority) return;
    setActionError(null);
    try {
      await updateTask.mutateAsync({
        priority: newPriority,
        version: task.version,
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to update priority');
    }
  };

  const handleAssigneeChange = async (newAssigneeId: string) => {
    if (!task) return;
    setActionError(null);
    try {
      await assignTask.mutateAsync({
        assigneeId: newAssigneeId ? newAssigneeId : null,
        version: task.version,
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to update assignee');
    }
  };

  const handleDueDateChange = async (newDueDate: string) => {
    if (!task) return;
    setActionError(null);
    try {
      await updateTask.mutateAsync({
        dueDate: newDueDate ? newDueDate : null,
        version: task.version,
      });
    } catch (err: any) {
      setActionError(err.message || 'Failed to update due date');
    }
  };

  const handleAddSubtask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newSubtaskTitle.trim()) return;
    setActionError(null);
    setIsAddingSubtask(true);
    try {
      await createSubtask.mutateAsync({
        title: newSubtaskTitle.trim(),
        statusId: task.statusId,
        priority: 'MEDIUM',
      });
      setNewSubtaskTitle('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to add subtask');
    } finally {
      setIsAddingSubtask(false);
    }
  };

  const handleAttachLabel = async (labelId: string) => {
    if (!task || !labelId) return;
    setActionError(null);
    try {
      await attachLabel.mutateAsync(labelId);
    } catch (err: any) {
      setActionError(err.message || 'Failed to attach label');
    }
  };

  const handleDetachLabel = async (labelId: string) => {
    if (!task) return;
    setActionError(null);
    try {
      await detachLabel.mutateAsync(labelId);
    } catch (err: any) {
      setActionError(err.message || 'Failed to remove label');
    }
  };

  const handleCreateAndAttachLabel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !newLabelName.trim()) return;
    setActionError(null);
    try {
      const created = await createLabel.mutateAsync({
        name: newLabelName.trim(),
        color: newLabelColor,
      });
      await attachLabel.mutateAsync(created.id);
      setNewLabelName('');
      setIsCreatingLabel(false);
    } catch (err: any) {
      setActionError(err.message || 'Failed to create label');
    }
  };

  const handleDeleteTask = async () => {
    if (!task) return;
    try {
      await deleteTask.mutateAsync();
      onClose();
    } catch (err: any) {
      setActionError(err.message || 'Failed to delete task');
    }
  };

  // Filter available labels not yet attached
  const attachedLabelIds = new Set(task?.labels?.map((l) => l.labelId) || []);
  const availableLabels = projectLabels.filter((l) => !attachedLabelIds.has(l.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over / Modal Container */}
      <div className="relative z-50 flex flex-col w-full max-w-4xl max-h-[90vh] rounded-xl border border-border bg-surface shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Top Bar Header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border bg-surface-elevated/40">
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="font-mono text-xs font-semibold px-2 py-0.5">
              {task?.taskKey || 'TASK'}
            </Badge>

            {task && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: task.status.color }}
                />
                {task.status.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isConfirmingDelete ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsConfirmingDelete(true)}
                className="text-muted-foreground hover:text-status-danger h-8 px-2"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            ) : (
              <div className="flex items-center gap-1.5 bg-status-danger/10 border border-status-danger/30 rounded-md p-1 px-2 text-xs">
                <span className="text-status-danger font-medium">Delete?</span>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteTask}
                  className="h-6 px-2 text-xs"
                >
                  Yes
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsConfirmingDelete(false)}
                  className="h-6 px-2 text-xs"
                >
                  Cancel
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Action Error Banner */}
        {actionError && (
          <div className="flex items-center gap-2 px-6 py-2 bg-status-danger/10 border-b border-status-danger/20 text-xs text-status-danger">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <p>{actionError}</p>
          </div>
        )}

        {/* Content Area */}
        {isLoading ? (
          <div className="h-96 flex items-center justify-center text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : error || !task ? (
          <div className="h-96 flex flex-col items-center justify-center p-6 text-center">
            <AlertCircle className="w-10 h-10 text-status-danger mb-2" />
            <p className="text-sm font-semibold text-foreground">Task not found</p>
            <p className="text-xs text-muted-foreground mt-1">This task may have been removed or moved.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
            {/* Left 2 Cols: Main Content */}
            <div className="md:col-span-2 p-6 space-y-6">
              {/* Title Section */}
              <div>
                {isEditingTitle ? (
                  <div className="space-y-2">
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleTitleSave();
                        if (e.key === 'Escape') {
                          setTitle(task.title);
                          setIsEditingTitle(false);
                        }
                      }}
                      autoFocus
                      className="text-lg font-bold"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleTitleSave} className="h-7 text-xs">
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setTitle(task.title);
                          setIsEditingTitle(false);
                        }}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <h1
                    onClick={() => setIsEditingTitle(true)}
                    className="text-xl font-bold text-foreground cursor-pointer hover:bg-surface-elevated/60 p-1.5 -ml-1.5 rounded-md transition-colors"
                    title="Click to edit title"
                  >
                    {task.title}
                  </h1>
                )}
              </div>

              {/* Description Section */}
              <div className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Description
                </span>
                {isEditingDesc ? (
                  <div className="space-y-2">
                    <textarea
                      rows={5}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      autoFocus
                      placeholder="Add context or notes for this task..."
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                    <div className="flex items-center gap-2">
                      <Button size="sm" onClick={handleDescriptionSave} className="h-7 text-xs">
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setDescription(task.description || '');
                          setIsEditingDesc(false);
                        }}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingDesc(true)}
                    className="min-h-[72px] p-3 rounded-md border border-dashed border-border hover:border-muted-foreground/50 bg-background/50 cursor-pointer transition-colors"
                    title="Click to edit description"
                  >
                    {task.description ? (
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {task.description}
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No description provided. Click to add one...
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Subtasks Section */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" /> Subtasks
                    {task.subtasks && task.subtasks.length > 0 && (
                      <span className="text-foreground">
                        ({task.subtasks.filter((s) => s.status.category === 'DONE').length}/
                        {task.subtasks.length})
                      </span>
                    )}
                  </span>
                </div>

                {/* Subtasks List */}
                <div className="space-y-1.5">
                  {task.subtasks && task.subtasks.length > 0 ? (
                    task.subtasks.map((subtask) => (
                      <div
                        key={subtask.id}
                        onClick={() => onSelectTask && onSelectTask(subtask.id)}
                        className="flex items-center justify-between p-2 rounded-md border border-border bg-surface-elevated/40 hover:bg-surface-elevated cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: subtask.status.color }}
                          />
                          <span className="text-xs font-mono text-muted-foreground">
                            {task.taskKey.split('-')[0]}-{subtask.taskNumber}
                          </span>
                          <span
                            className={`text-sm truncate ${
                              subtask.status.category === 'DONE'
                                ? 'line-through text-muted-foreground'
                                : 'text-foreground'
                            }`}
                          >
                            {subtask.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {getPriorityBadge(subtask.priority)}
                          <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic py-1">
                      No subtasks added yet.
                    </p>
                  )}
                </div>

                {/* Add Subtask Input */}
                <form onSubmit={handleAddSubtask} className="flex items-center gap-2 pt-1">
                  <Input
                    placeholder="Add a subtask and press Enter..."
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    disabled={isAddingSubtask}
                    className="h-8 text-xs"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isAddingSubtask || !newSubtaskTitle.trim()}
                    className="h-8 text-xs shrink-0"
                  >
                    {isAddingSubtask ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    <span>Add</span>
                  </Button>
                </form>
              </div>

              {/* Activity History Section */}
              <div className="space-y-3 pt-4 border-t border-border">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" /> Activity Log
                </span>

                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {activities.length > 0 ? (
                    activities.map((act) => (
                      <div
                        key={act.id}
                        className="flex items-start gap-2.5 text-xs text-muted-foreground py-1 border-b border-border/50 last:border-0"
                      >
                        <div className="w-5 h-5 rounded-full bg-surface-elevated border border-border flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold text-foreground">
                          {act.actor?.name ? act.actor.name[0].toUpperCase() : 'A'}
                        </div>
                        <div className="flex-1">
                          <p className="text-foreground">
                            <span className="font-semibold">{act.actor?.name || 'Someone'}</span>{' '}
                            <span className="text-muted-foreground">
                              {act.action === 'TASK_CREATED' && 'created this task'}
                              {act.action === 'TASK_ASSIGNED' &&
                                `assigned task to ${act.metadata?.assigneeName || 'a member'}`}
                              {act.action === 'TASK_UNASSIGNED' && 'removed the assignee'}
                              {act.action === 'TASK_STATUS_CHANGED' &&
                                `changed status to ${act.metadata?.newStatusName || 'another stage'}`}
                              {!['TASK_CREATED', 'TASK_ASSIGNED', 'TASK_UNASSIGNED', 'TASK_STATUS_CHANGED'].includes(act.action) &&
                                act.action.replace(/_/g, ' ').toLowerCase()}
                            </span>
                          </p>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {new Date(act.createdAt).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No activities recorded yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right 1 Col: Metadata Sidebar */}
            <div className="p-6 space-y-5 bg-surface/50">
              {/* Status Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Status
                </label>
                <select
                  value={task.statusId}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Priority Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5 text-primary" /> Priority
                </label>
                <select
                  value={task.priority}
                  onChange={(e) => handlePriorityChange(e.target.value as TaskPriority)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              {/* Assignee Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <UserIcon className="w-3.5 h-3.5 text-primary" /> Assignee
                </label>
                <select
                  value={task.assigneeId || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-primary" /> Due Date
                </label>
                <input
                  type="date"
                  value={task.dueDate ? task.dueDate.split('T')[0] : ''}
                  onChange={(e) => handleDueDateChange(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              {/* Labels Manager */}
              <div className="space-y-2 pt-2 border-t border-border">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" /> Labels
                </label>

                {/* Attached Label Chips */}
                <div className="flex flex-wrap gap-1.5 min-h-[28px]">
                  {task.labels && task.labels.length > 0 ? (
                    task.labels.map(({ label }) => (
                      <span
                        key={label.id}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border"
                        style={{
                          backgroundColor: `${label.color}15`,
                          borderColor: `${label.color}40`,
                          color: label.color,
                        }}
                      >
                        {label.name}
                        <button
                          type="button"
                          onClick={() => handleDetachLabel(label.id)}
                          className="hover:opacity-75 focus:outline-none"
                          title="Remove label"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No labels</span>
                  )}
                </div>

                {/* Attach Existing Label Select */}
                {availableLabels.length > 0 && (
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAttachLabel(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="w-full rounded-md border border-border bg-background px-3 py-1 text-xs text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    <option value="" disabled>
                      + Add existing label...
                    </option>
                    {availableLabels.map((lbl) => (
                      <option key={lbl.id} value={lbl.id}>
                        {lbl.name}
                      </option>
                    ))}
                  </select>
                )}

                {/* Create New Label Form */}
                {isCreatingLabel ? (
                  <form
                    onSubmit={handleCreateAndAttachLabel}
                    className="p-2.5 rounded-md border border-border bg-background space-y-2 mt-2"
                  >
                    <span className="text-xs font-semibold text-foreground">Create New Label</span>
                    <Input
                      placeholder="Label name..."
                      value={newLabelName}
                      onChange={(e) => setNewLabelName(e.target.value)}
                      className="h-7 text-xs"
                      autoFocus
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {PRESET_LABEL_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewLabelColor(color)}
                          className={`w-5 h-5 rounded-full border transition-all ${
                            newLabelColor === color
                              ? 'scale-110 ring-2 ring-primary ring-offset-1'
                              : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsCreatingLabel(false)}
                        className="h-6 px-2 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={!newLabelName.trim()}
                        className="h-6 px-2 text-xs"
                      >
                        Create
                      </Button>
                    </div>
                  </form>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatingLabel(true)}
                    className="w-full h-7 text-xs flex items-center justify-center gap-1 text-muted-foreground hover:text-foreground"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Create New Label</span>
                  </Button>
                )}
              </div>

              {/* Footer Timestamps */}
              <div className="pt-4 border-t border-border space-y-1 text-[11px] text-muted-foreground">
                <p>
                  Created by <span className="text-foreground">{task.creator?.name || 'User'}</span>
                </p>
                <p>
                  Created: {new Date(task.createdAt).toLocaleDateString()}
                </p>
                <p>
                  Updated: {new Date(task.updatedAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
