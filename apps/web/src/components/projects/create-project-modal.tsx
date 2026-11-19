'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createProjectSchema, CreateProjectInput } from '@flowspace/shared';
import { zodResolver } from '@/lib/zod-resolver';
import { useCreateProject } from '@/hooks/use-project';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  onSuccess?: (projectKey: string) => void;
}

export function CreateProjectModal({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  onSuccess,
}: CreateProjectModalProps) {
  const createProj = useCreateProject(workspaceId);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateProjectInput>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      key: '',
      description: '',
      startDate: null,
      dueDate: null,
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue('name', val);

    // Auto-generate key initials
    const words = val.trim().replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
    let autoKey = '';
    if (words.length > 1) {
      autoKey = words.map((w) => w[0].toUpperCase()).join('');
      if (autoKey.length < 2 && words[0]) {
        autoKey = words[0].substring(0, 3).toUpperCase();
      }
    } else if (words.length === 1) {
      autoKey = words[0].substring(0, Math.min(4, words[0].length)).toUpperCase();
    }
    if (autoKey.length >= 2) {
      setValue('key', autoKey.substring(0, 10));
    }
  };

  const onSubmit = async (data: CreateProjectInput) => {
    setServerError(null);
    try {
      const created = await createProj.mutateAsync({
        name: data.name,
        key: data.key.toUpperCase(),
        description: data.description || undefined,
        startDate: data.startDate || null,
        dueDate: data.dueDate || null,
      });
      reset();
      onClose();
      if (onSuccess && created?.key) {
        onSuccess(created.key);
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to create project');
    }
  };

  const handleClose = () => {
    setServerError(null);
    reset();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create Project"
      description={`Create a new project in ${workspaceName} to organize issues and development tasks.`}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 text-xs rounded-md bg-status-danger/10 border border-status-danger/30 text-status-danger">
            {serverError}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="proj-name">Project Name</Label>
          <Input
            id="proj-name"
            placeholder="e.g. Web Platform"
            {...register('name')}
            onChange={handleNameChange}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && (
            <p className="text-xs text-status-danger mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="proj-key">Project Key</Label>
            <span className="text-[10px] text-muted-foreground uppercase font-mono">
              Prefix for tasks (e.g. WEB-1)
            </span>
          </div>
          <Input
            id="proj-key"
            placeholder="WEB"
            className="font-mono uppercase"
            maxLength={10}
            {...register('key')}
            onChange={(e) => setValue('key', e.target.value.toUpperCase())}
            aria-invalid={Boolean(errors.key)}
          />
          {errors.key && (
            <p className="text-xs text-status-danger mt-1">
              {errors.key.message}
            </p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="proj-desc">Description (Optional)</Label>
          <textarea
            id="proj-desc"
            placeholder="Brief purpose and deliverables of this project"
            className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary min-h-[80px]"
            {...register('description')}
          />
          {errors.description && (
            <p className="text-xs text-status-danger mt-1">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="proj-start-date">Start Date</Label>
            <Input
              id="proj-start-date"
              type="date"
              {...register('startDate')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="proj-due-date">Due Date</Label>
            <Input
              id="proj-due-date"
              type="date"
              {...register('dueDate')}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
