'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createTaskSchema, CreateTaskInput, TaskPriority } from '@flowspace/shared';
import { zodResolver } from '@/lib/zod-resolver';
import { useCreateTask } from '@/hooks/use-tasks';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Loader2 } from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectKey: string;
  statuses?: Array<{ id: string; name: string; color: string; isDefault?: boolean }>;
  members?: Array<{ userId: string; user: { id: string; name: string; email: string; avatarUrl?: string | null } }>;
  onSuccess?: (taskId: string) => void;
}

export function CreateTaskModal({
  isOpen,
  onClose,
  projectId,
  projectKey,
  statuses = [],
  members = [],
  onSuccess,
}: CreateTaskModalProps) {
  const createTask = useCreateTask(projectId);
  const [serverError, setServerError] = useState<string | null>(null);

  const defaultStatusId = statuses.find((s) => s.isDefault)?.id || statuses[0]?.id;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTaskInput>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      statusId: defaultStatusId,
      priority: 'MEDIUM',
      assigneeId: null,
      dueDate: null,
    },
  });

  const onSubmit = async (data: CreateTaskInput) => {
    setServerError(null);
    try {
      const created = await createTask.mutateAsync({
        title: data.title,
        description: data.description || undefined,
        statusId: data.statusId || defaultStatusId,
        priority: data.priority || 'MEDIUM',
        assigneeId: data.assigneeId || null,
        dueDate: data.dueDate || null,
      });
      reset();
      onClose();
      if (onSuccess && created?.id) {
        onSuccess(created.id);
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to create task. Please try again.');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Task"
      description={`Add a new task to ${projectKey}`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="flex items-center gap-2 p-3 text-sm text-status-danger bg-status-danger/10 border border-status-danger/20 rounded-md">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p>{serverError}</p>
          </div>
        )}

        {/* Title */}
        <div className="space-y-1.5">
          <Label htmlFor="task-title" className="text-foreground text-xs font-semibold">
            Task Title <span className="text-status-danger">*</span>
          </Label>
          <Input
            id="task-title"
            placeholder="e.g. Implement user authentication flow"
            {...register('title')}
            className={errors.title ? 'border-status-danger' : ''}
          />
          {errors.title && (
            <p className="text-xs text-status-danger">{errors.title.message}</p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="task-description" className="text-foreground text-xs font-semibold">
            Description
          </Label>
          <textarea
            id="task-description"
            rows={3}
            placeholder="Provide context, acceptance criteria, or technical details..."
            {...register('description')}
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {errors.description && (
            <p className="text-xs text-status-danger">{errors.description.message}</p>
          )}
        </div>

        {/* Status & Priority Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-status" className="text-foreground text-xs font-semibold">
              Status
            </Label>
            <select
              id="task-status"
              {...register('statusId')}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {statuses.map((status) => (
                <option key={status.id} value={status.id}>
                  {status.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-priority" className="text-foreground text-xs font-semibold">
              Priority
            </Label>
            <select
              id="task-priority"
              {...register('priority')}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        {/* Assignee & Due Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-assignee" className="text-foreground text-xs font-semibold">
              Assignee
            </Label>
            <select
              id="task-assignee"
              {...register('assigneeId')}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.userId} value={m.userId}>
                  {m.user.name} ({m.user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-due-date" className="text-foreground text-xs font-semibold">
              Due Date
            </Label>
            <Input
              id="task-due-date"
              type="date"
              {...register('dueDate')}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Create Task</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}
