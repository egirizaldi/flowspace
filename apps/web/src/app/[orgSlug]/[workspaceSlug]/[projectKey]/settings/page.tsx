'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { updateProjectSchema, UpdateProjectInput, ProjectLifecycleStatus } from '@flowspace/shared';
import { zodResolver } from '@/lib/zod-resolver';
import { useOrganizations } from '@/hooks/use-organization';
import { useOrganizationWorkspaces } from '@/hooks/use-workspace';
import {
  useWorkspaceProjects,
  useProject,
  useUpdateProject,
  useArchiveProject,
  useRestoreProject,
  useDeleteProject,
} from '@/hooks/use-project';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Loader2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Archive,
  RefreshCw,
} from 'lucide-react';

interface PageProps {
  params: Promise<{
    orgSlug: string;
    workspaceSlug: string;
    projectKey: string;
  }>;
}

type FormData = UpdateProjectInput;

export default function ProjectSettingsPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const { orgSlug, workspaceSlug, projectKey } = resolvedParams;
  const router = useRouter();

  const { data: organizations = [], isLoading: isOrgsLoading } = useOrganizations();
  const currentOrg = organizations.find((o) => o.slug === orgSlug);

  const { data: workspaces = [], isLoading: isWorkspacesLoading } =
    useOrganizationWorkspaces(currentOrg?.id || null);
  const currentWs = workspaces.find((w) => w.slug === workspaceSlug);

  const { data: projects = [], isLoading: isProjectsLoading } =
    useWorkspaceProjects(currentWs?.id || null, { includeArchived: true });
  const currentProject = projects.find(
    (p) => p.key.toUpperCase() === projectKey.toUpperCase(),
  );

  const { data: projectDetail, isLoading: isDetailLoading } = useProject(
    currentProject?.id || null,
  );

  const project = projectDetail || currentProject;

  const updateProj = useUpdateProject(project?.id || '', currentWs?.id);
  const archiveProj = useArchiveProject(project?.id || '', currentWs?.id);
  const restoreProj = useRestoreProject(project?.id || '', currentWs?.id);
  const deleteProj = useDeleteProject(project?.id || '', currentWs?.id);

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
    resolver: zodResolver(updateProjectSchema),
  });

  useEffect(() => {
    if (project) {
      reset({
        name: project.name,
        description: project.description || '',
        status: project.status,
        startDate: project.startDate ? project.startDate.split('T')[0] : null,
        dueDate: project.dueDate ? project.dueDate.split('T')[0] : null,
      });
    }
  }, [project, reset]);

  if (isOrgsLoading || isWorkspacesLoading || isProjectsLoading || isDetailLoading) {
    return (
      <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading project settings...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentOrg || !currentWs || !project) {
    return (
      <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
        <div className="p-8 text-center max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-foreground">
            Project not found
          </h2>
          <Button
            onClick={() =>
              router.push(`/${currentOrg?.slug || orgSlug}/${currentWs?.slug || workspaceSlug}`)
            }
            className="mt-4"
          >
            Back to Workspace
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const onSubmit = async (data: FormData) => {
    setFeedback(null);
    try {
      await updateProj.mutateAsync({
        name: data.name,
        description: data.description || null,
        status: data.status,
        startDate: data.startDate || null,
        dueDate: data.dueDate || null,
      });
      setFeedback({
        type: 'success',
        message: 'Project settings updated successfully.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update project settings.',
      });
    }
  };

  const handleArchive = async () => {
    setFeedback(null);
    try {
      if (project.archivedAt) {
        await restoreProj.mutateAsync();
        setFeedback({
          type: 'success',
          message: 'Project restored successfully.',
        });
      } else {
        await archiveProj.mutateAsync();
        setFeedback({
          type: 'success',
          message: 'Project archived successfully.',
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update archive status.',
      });
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== project.key) return;
    try {
      await deleteProj.mutateAsync();
      router.push(`/${orgSlug}/${workspaceSlug}`);
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to delete project.',
      });
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
      <div className="max-w-3xl space-y-8">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={`/${orgSlug}/${workspaceSlug}/${project.key}`}
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-mono">{project.key}</span>
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">Settings</span>
        </div>

        {/* Header */}
        <div className="pb-6 border-b border-border">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">
              Project Settings
            </h1>
            <Badge variant="outline" className="font-mono text-xs">
              {project.key}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Configure project details, lifecycle status, and archive status.
          </p>
        </div>

        {/* Feedback alert */}
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
            <CardTitle className="text-base font-semibold">
              General Information
            </CardTitle>
            <CardDescription className="text-xs">
              Update name, description, and timeline attributes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
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
                <Label htmlFor="description">Description</Label>
                <textarea
                  id="description"
                  rows={3}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-xs text-status-danger mt-1">
                    {errors.description.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="status">Lifecycle Status</Label>
                <select
                  id="status"
                  {...register('status')}
                  className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
                >
                  <option value="PLANNING">Planning</option>
                  <option value="ACTIVE">Active</option>
                  <option value="ON_HOLD">On Hold</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input id="startDate" type="date" {...register('startDate')} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input id="dueDate" type="date" {...register('dueDate')} />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-border">
                <Button type="submit" disabled={isSubmitting || !isDirty}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-status-danger/30">
          <CardHeader>
            <CardTitle className="text-base font-semibold text-status-danger flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Danger Zone
            </CardTitle>
            <CardDescription className="text-xs">
              Actions that impact project availability and task accessibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Archive / Restore Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-border bg-surface-elevated">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {project.archivedAt ? 'Restore Project' : 'Archive Project'}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {project.archivedAt
                    ? 'Restore this project back to the active workspace project list.'
                    : 'Archive this project to hide it from active views without losing tasks.'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleArchive}
                disabled={archiveProj.isPending || restoreProj.isPending}
                className="shrink-0"
              >
                {project.archivedAt ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                    Restore
                  </>
                ) : (
                  <>
                    <Archive className="w-3.5 h-3.5 mr-1.5" />
                    Archive
                  </>
                )}
              </Button>
            </div>

            {/* Delete Action */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border border-status-danger/30 bg-status-danger/5">
              <div>
                <p className="text-sm font-medium text-status-danger">
                  Delete Project
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permanently delete this project, all tasks, statuses, and memberships.
                </p>
              </div>

              {!deleteConfirmOpen ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                  Delete
                </Button>
              ) : (
                <div className="flex flex-col gap-2 w-full sm:w-auto">
                  <p className="text-xs font-mono text-muted-foreground">
                    Type <strong className="text-foreground">{project.key}</strong> to confirm:
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      size={10}
                      placeholder={project.key}
                      value={deleteInput}
                      onChange={(e) => setDeleteInput(e.target.value.toUpperCase())}
                      className="h-8 text-xs font-mono uppercase bg-surface"
                    />
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDelete}
                      disabled={deleteInput !== project.key || deleteProj.isPending}
                    >
                      {deleteProj.isPending ? 'Deleting...' : 'Confirm'}
                    </Button>
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
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
