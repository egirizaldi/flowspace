'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createOrganizationSchema } from '@flowspace/shared';
import { zodResolver } from '@/lib/zod-resolver';
import { useCreateOrganization } from '@/hooks/use-organization';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRouter } from 'next/navigation';

interface CreateOrganizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (orgSlug: string) => void;
}

interface FormData {
  name: string;
  slug: string;
  description?: string;
}

export function CreateOrganizationModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateOrganizationModalProps) {
  const router = useRouter();
  const createOrg = useCreateOrganization();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createOrganizationSchema),
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
      const created = await createOrg.mutateAsync({
        name: data.name,
        slug: data.slug,
        description: data.description || undefined,
      });
      reset();
      onClose();
      if (onSuccess) {
        onSuccess(created.slug);
      } else {
        router.push(`/${created.slug}`);
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to create organization');
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Organization"
      description="Organizations represent your company or team boundary."
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {serverError && (
          <div className="p-3 text-xs rounded-md bg-status-danger/10 border border-status-danger/30 text-status-danger">
            {serverError}
          </div>
        )}

        <div className="space-y-1">
          <Label htmlFor="org-name">Organization Name</Label>
          <Input
            id="org-name"
            placeholder="e.g. Acme Corporation"
            {...register('name')}
            onChange={handleNameChange}
            aria-invalid={Boolean(errors.name)}
          />
          {errors.name && (
            <p className="text-xs text-status-danger mt-1">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="org-slug">URL Slug</Label>
          <div className="flex items-center">
            <span className="text-xs text-muted-foreground mr-2 font-mono">
              /
            </span>
            <Input
              id="org-slug"
              placeholder="acme-corporation"
              {...register('slug')}
              aria-invalid={Boolean(errors.slug)}
            />
          </div>
          {errors.slug && (
            <p className="text-xs text-status-danger mt-1">{errors.slug.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="org-desc">Description (Optional)</Label>
          <Input
            id="org-desc"
            placeholder="What does your organization do?"
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
            {isSubmitting ? 'Creating...' : 'Create Organization'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
