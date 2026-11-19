'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createWorkspaceSchema } from '@flowspace/shared';
import { zodResolver } from '@/lib/zod-resolver';
import { useCreateWorkspace } from '@/hooks/use-workspace';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationSlug: string;
  onSuccess?: (workspaceSlug: string) => void;
}

interface FormData {
  name: string;
  slug?: string;
  description?: string;
}

export function CreateWorkspaceModal({
  isOpen,
  onClose,
  organizationId,
  organizationSlug,
  onSuccess,
}: CreateWorkspaceModalProps) {
  const router = useRouter();
  const createWs = useCreateWorkspace(organizationId);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createWorkspaceSchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
    },
  });

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setValue('name', val);
    const autoSlug = val
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
    setValue('slug', autoSlug);
  };

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    try {
      const created = await createWs.mutateAsync({
        name: data.name,
        slug: data.slug || undefined,
        description: data.description || undefined,
      });
      reset();
      onClose();
      if (onSuccess) {
        onSuccess(created.slug);
      } else {
        router.push(`/${organizationSlug}/${created.slug}`);
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to create workspace');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Workspace"
      description="Workspaces contain your projects, boards, and team members."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 text-xs rounded-md bg-status-danger/10 border border-status-danger/30 text-status-danger">
            {serverError}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="ws-name">Workspace Name</Label>
          <Input
            id="ws-name"
            placeholder="e.g. Core Engineering"
            {...register('name')}
            onChange={handleNameChange}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && (
            <p className="text-xs text-status-danger mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="ws-slug">URL Slug (Optional)</Label>
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground mr-2 font-mono">
              /{organizationSlug}/
            </span>
            <Input
              id="ws-slug"
              placeholder="core-engineering"
              {...register('slug')}
              aria-invalid={Boolean(errors.slug)}
            />
          </div>
          {errors.slug && (
            <p className="text-xs text-status-danger mt-1">{errors.slug.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="ws-desc">Description (Optional)</Label>
          <Input
            id="ws-desc"
            placeholder="Workspace focus and team scope"
            {...register('description')}
            aria-invalid={Boolean(errors.description)}
          />
          {errors.description && (
            <p className="text-xs text-status-danger mt-1">
              {errors.description.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating...' : 'Create Workspace'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
