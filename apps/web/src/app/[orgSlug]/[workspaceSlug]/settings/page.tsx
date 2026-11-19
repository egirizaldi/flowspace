'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { updateWorkspaceSchema, UpdateWorkspaceInput } from '@flowspace/shared';
import { zodResolver } from '@/lib/zod-resolver';
import { useOrganizations } from '@/hooks/use-organization';
import {
  useOrganizationWorkspaces,
  useWorkspace,
  useUpdateWorkspace,
  useDeleteWorkspace,
} from '@/hooks/use-workspace';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Loader2, Trash2, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PageProps {
  params: Promise<{ orgSlug: string; workspaceSlug: string }>;
}

type FormData = UpdateWorkspaceInput;

export default function WorkspaceSettingsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { orgSlug, workspaceSlug } = resolvedParams;
  const router = useRouter();

  const { data: organizations = [], isLoading: isOrgsLoading } = useOrganizations();
  const currentOrg = organizations.find((o) => o.slug === orgSlug);

  const { data: workspaces = [], isLoading: isWorkspacesLoading } =
    useOrganizationWorkspaces(currentOrg?.id || null);
  const currentWs = workspaces.find((w) => w.slug === workspaceSlug);

  const { data: wsDetail, isLoading: isDetailLoading } = useWorkspace(
    currentWs?.id || null,
  );

  const updateWs = useUpdateWorkspace(currentWs?.id || '', currentOrg?.id);
  const deleteWs = useDeleteWorkspace(currentWs?.id || '', currentOrg?.id);

  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(updateWorkspaceSchema),
  });

  useEffect(() => {
    if (wsDetail) {
      reset({
        name: wsDetail.name,
        description: wsDetail.description || '',
      });
    }
  }, [wsDetail, reset]);

  if (isOrgsLoading || isWorkspacesLoading || isDetailLoading) {
    return (
      <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentOrg || !currentWs) {
    return (
      <DashboardLayout activeOrgSlug={orgSlug}>
        <div className="p-8 text-center max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-foreground">
            Workspace not found
          </h2>
          <Button onClick={() => router.push(currentOrg ? `/${currentOrg.slug}` : '/organizations')}>
            Back
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const isOwnerOrAdmin =
    currentWs.userRole === 'OWNER' || currentWs.userRole === 'ADMIN';
  const isOwner = currentWs.userRole === 'OWNER';

  const onUpdate = async (data: FormData) => {
    setFeedback(null);
    try {
      await updateWs.mutateAsync({
        name: data.name,
        description: data.description || null,
      });
      setFeedback({
        type: 'success',
        message: 'Workspace settings updated successfully.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update workspace settings.',
      });
    }
  };

  const onDelete = async () => {
    if (deleteInput !== currentWs.name) return;
    try {
      await deleteWs.mutateAsync();
      router.push(`/${currentOrg.slug}`);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete workspace.',
      });
    }
  };

  return (
    <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
      <div className="space-y-8 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Workspace Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage general configuration and settings for {currentWs.name}.
          </p>
        </div>

        {feedback && (
          <div
            className={`p-4 rounded-lg flex items-center gap-3 text-sm ${
              feedback.type === 'success'
                ? 'bg-status-success/10 border border-status-success/30 text-status-success'
                : 'bg-status-danger/10 border border-status-danger/30 text-status-danger'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General Information</CardTitle>
            <CardDescription className="text-xs">
              Update the name and description of this workspace.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onUpdate)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Workspace Name</Label>
                <Input
                  id="name"
                  disabled={!isOwnerOrAdmin || isSubmitting}
                  {...register('name')}
                  aria-invalid={Boolean(errors.name)}
                />
                {errors.name && (
                  <p className="text-xs text-status-danger mt-1">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  disabled
                  value={currentWs.slug}
                  className="bg-surface-elevated font-mono text-muted-foreground"
                />
                <p className="text-[11px] text-muted-foreground">
                  Workspace URL slugs cannot be modified after creation.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  disabled={!isOwnerOrAdmin || isSubmitting}
                  placeholder="Workspace description"
                  {...register('description')}
                  aria-invalid={Boolean(errors.description)}
                />
                {errors.description && (
                  <p className="text-xs text-status-danger mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              {isOwnerOrAdmin ? (
                <div className="flex justify-end pt-2">
                  <Button type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  Only workspace owners or admins can modify these settings.
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        {isOwner && (
          <Card className="border-status-danger/40 bg-status-danger/5">
            <CardHeader>
              <CardTitle className="text-base text-status-danger flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> Danger Zone
              </CardTitle>
              <CardDescription className="text-xs">
                Permanently delete this workspace and all associated projects and tasks. This action cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!deleteConfirmOpen ? (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="text-xs"
                >
                  Delete Workspace
                </Button>
              ) : (
                <div className="p-4 rounded-lg border border-status-danger/40 bg-surface space-y-3">
                  <p className="text-xs text-muted-foreground">
                    To confirm deletion, type the workspace name{' '}
                    <strong className="text-foreground font-mono">
                      {currentWs.name}
                    </strong>{' '}
                    below:
                  </p>
                  <Input
                    placeholder={currentWs.name}
                    value={deleteInput}
                    onChange={(e) => setDeleteInput(e.target.value)}
                  />
                  <div className="flex items-center gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDeleteConfirmOpen(false);
                        setDeleteInput('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={deleteInput !== currentWs.name || deleteWs.isPending}
                      onClick={onDelete}
                    >
                      {deleteWs.isPending ? 'Deleting...' : 'I understand, delete this workspace'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
