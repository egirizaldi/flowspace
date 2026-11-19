'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FolderKanban,
  Users,
  Settings,
  Shield,
  Loader2,
  Calendar,
  Layers,
  ArrowRight,
  Kanban,
  Clock,
  ArrowLeft,
} from 'lucide-react';
import { useOrganizations } from '@/hooks/use-organization';
import { useOrganizationWorkspaces } from '@/hooks/use-workspace';
import { useWorkspaceProjects, useProject } from '@/hooks/use-project';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface PageProps {
  params: Promise<{
    orgSlug: string;
    workspaceSlug: string;
    projectKey: string;
  }>;
}

export default function ProjectOverviewPage({ params }: PageProps) {
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
  const currentProjectSummary = projects.find(
    (p) => p.key.toUpperCase() === projectKey.toUpperCase(),
  );

  const { data: projectDetail, isLoading: isDetailLoading } = useProject(
    currentProjectSummary?.id || null,
  );

  if (isOrgsLoading || isWorkspacesLoading || isProjectsLoading || isDetailLoading) {
    return (
      <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading project...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentOrg || !currentWs || !currentProjectSummary) {
    return (
      <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
        <div className="p-8 text-center max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-foreground">
            Project not found
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            The project &quot;{projectKey}&quot; could not be found in this workspace.
          </p>
          <Button
            onClick={() =>
              router.push(`/${currentOrg?.slug || orgSlug}/${currentWs?.slug || workspaceSlug}`)
            }
          >
            Back to Workspace
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const project = projectDetail || currentProjectSummary;

  return (
    <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
      <div className="space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link
            href={`/${orgSlug}/${workspaceSlug}`}
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{currentWs.name}</span>
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium font-mono">{project.key}</span>
        </div>

        {/* Project Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xl shrink-0 font-mono">
              {project.key}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-foreground">
                  {project.name}
                </h1>
                <Badge
                  variant="outline"
                  className={`text-xs font-mono uppercase ${
                    project.status === 'ACTIVE'
                      ? 'text-status-success border-status-success/30 bg-status-success/5'
                      : project.status === 'COMPLETED'
                      ? 'text-blue-400 border-blue-400/30 bg-blue-400/5'
                      : 'text-muted-foreground'
                  }`}
                >
                  {project.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                /{orgSlug}/{workspaceSlug}/{project.key}
              </p>
              {project.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                  {project.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            <Button
              variant="outline"
              onClick={() =>
                router.push(`/${orgSlug}/${workspaceSlug}/${project.key}/settings`)
              }
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Project Settings</span>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Users className="w-4 h-4 text-primary" /> Project Members
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {projectDetail?.members?.length || project._count?.members || 1}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <FolderKanban className="w-4 h-4 text-primary" /> Workflow Stages
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {project.statuses?.length || 5}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Calendar className="w-4 h-4 text-primary" /> Due Date
              </CardDescription>
              <CardTitle className="text-sm font-medium pt-1 font-mono">
                {project.dueDate
                  ? new Date(project.dueDate).toLocaleDateString()
                  : 'No deadline set'}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Workflow Stages Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Workflow Statuses
              </h2>
              <p className="text-xs text-muted-foreground">
                Configured pipeline stages for tasks in this project.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
            {(project.statuses || []).map((status) => (
              <div
                key={status.id}
                className="p-3 rounded-lg border border-border bg-surface flex flex-col justify-between"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm font-medium text-foreground truncate">
                    {status.name}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono">
                  <span>{status.category}</span>
                  {status.isDefault && (
                    <Badge variant="outline" className="text-[9px] px-1 py-0">
                      Default
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Project Members Section */}
        {projectDetail?.members && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">
                  Project Members ({projectDetail.members.length})
                </h2>
                <p className="text-xs text-muted-foreground">
                  Team members collaborating on this project.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {projectDetail.members.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 flex items-center justify-between hover:bg-surface-elevated transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-xs font-semibold text-foreground">
                      {m.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {m.user.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {m.user.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs font-mono">
                    <Shield className="w-3 h-3 mr-1 text-primary" />
                    {m.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
