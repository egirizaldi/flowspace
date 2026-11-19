'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  FolderKanban,
  Users,
  Settings,
  Shield,
  Loader2,
  Plus,
  ArrowRight,
  Clock,
  UserPlus,
} from 'lucide-react';
import { useOrganizations } from '@/hooks/use-organization';
import { useOrganizationWorkspaces, useWorkspace } from '@/hooks/use-workspace';
import { useWorkspaceInvitations } from '@/hooks/use-invitation';
import { useWorkspaceProjects } from '@/hooks/use-project';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { InviteMemberModal } from '@/components/invitations/invite-member-modal';
import { PendingInvitationsList } from '@/components/invitations/pending-invitations-list';
import { CreateProjectModal } from '@/components/projects/create-project-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface PageProps {
  params: Promise<{ orgSlug: string; workspaceSlug: string }>;
}

export default function WorkspaceOverviewPage({ params }: PageProps) {
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

  const { data: projects = [], isLoading: isProjectsLoading } =
    useWorkspaceProjects(currentWs?.id || null);

  const { data: pendingInvitations = [] } = useWorkspaceInvitations(
    currentWs?.id || null,
  );

  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [createProjModalOpen, setCreateProjModalOpen] = useState(false);

  const isOwnerOrAdmin =
    currentWs?.userRole === 'OWNER' || currentWs?.userRole === 'ADMIN';

  const canCreateProject = currentWs?.userRole !== 'VIEWER';

  if (isOrgsLoading || isWorkspacesLoading || isDetailLoading) {
    return (
      <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading workspace...</p>
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
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            The workspace &quot;{workspaceSlug}&quot; could not be found in this organization.
          </p>
          <Button onClick={() => router.push(currentOrg ? `/${currentOrg.slug}` : '/organizations')}>
            Back to {currentOrg?.name || 'Organizations'}
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeOrgSlug={orgSlug} activeWorkspaceSlug={workspaceSlug}>
      <div className="space-y-8">
        {/* Workspace Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-surface-elevated border border-border text-primary flex items-center justify-center font-bold text-2xl shrink-0">
              <Layers className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-foreground">
                  {currentWs.name}
                </h1>
                <Badge variant="outline" className="text-xs font-mono">
                  <Shield className="w-3 h-3 mr-1 text-primary" />
                  {currentWs.userRole}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                /{currentOrg.slug}/{currentWs.slug}
              </p>
              {currentWs.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                  {currentWs.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {canCreateProject && (
              <Button
                onClick={() => setCreateProjModalOpen(true)}
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project</span>
              </Button>
            )}
            {isOwnerOrAdmin && (
              <Button
                variant="outline"
                onClick={() => setInviteModalOpen(true)}
                className="flex items-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Member</span>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => router.push(`/${currentOrg.slug}/${currentWs.slug}/settings`)}
              className="flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Workspace Settings</span>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <FolderKanban className="w-4 h-4 text-primary" /> Active Projects
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {projects.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Users className="w-4 h-4 text-primary" /> Workspace Members
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {wsDetail?.members.length || currentWs._count.members}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Projects Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Projects</h2>
              <p className="text-xs text-muted-foreground">
                Manage development cycles, boards, and tasks in this workspace.
              </p>
            </div>
            {canCreateProject && projects.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCreateProjModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>New Project</span>
              </Button>
            )}
          </div>

          {projects.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center bg-surface/40">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
                <FolderKanban className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                No projects created yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Projects organize issues and workflows. Create your first project to start managing tasks.
              </p>
              {canCreateProject && (
                <Button
                  onClick={() => setCreateProjModalOpen(true)}
                  className="flex items-center gap-2 mx-auto"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Project</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((proj) => (
                <Link
                  key={proj.id}
                  href={`/${orgSlug}/${workspaceSlug}/${proj.key}`}
                  className="block group"
                >
                  <Card className="h-full border-border bg-surface transition-all duration-200 hover:border-primary/50 hover:bg-surface-elevated flex flex-col justify-between">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs font-semibold px-2 py-0.5 border-primary/30 text-primary bg-primary/5"
                        >
                          {proj.key}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] uppercase font-mono ${
                            proj.status === 'ACTIVE'
                              ? 'text-status-success border-status-success/30 bg-status-success/5'
                              : proj.status === 'COMPLETED'
                              ? 'text-blue-400 border-blue-400/30 bg-blue-400/5'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {proj.status}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-semibold group-hover:text-primary transition-colors flex items-center justify-between">
                        <span>{proj.name}</span>
                        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      </CardTitle>
                      {proj.description && (
                        <CardDescription className="text-xs line-clamp-2 mt-1">
                          {proj.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 text-xs text-muted-foreground flex items-center justify-between border-t border-border/50 py-3 mt-auto">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          {proj._count?.members || 1}
                        </span>
                        <span className="flex items-center gap-1">
                          <FolderKanban className="w-3.5 h-3.5" />
                          {proj._count?.tasks || 0} tasks
                        </span>
                      </div>
                      {proj.dueDate && (
                        <span className="flex items-center gap-1 text-[11px] font-mono">
                          <Clock className="w-3 h-3" />
                          {new Date(proj.dueDate).toLocaleDateString()}
                        </span>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Workspace Members Section */}
        {wsDetail && wsDetail.members && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Workspace Members ({wsDetail.members.length})
              </h2>
            </div>

            <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {wsDetail.members.map((m) => (
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
                    {m.role}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pending Invitations Section */}
        {isOwnerOrAdmin && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                Pending Invitations ({pendingInvitations.length})
              </h2>
            </div>
            <PendingInvitationsList
              invitations={pendingInvitations}
              workspaceId={currentWs.id}
              canManage={isOwnerOrAdmin}
            />
          </div>
        )}
      </div>

      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        scope="workspace"
        targetId={currentWs.id}
        targetName={currentWs.name}
      />

      <CreateProjectModal
        isOpen={createProjModalOpen}
        onClose={() => setCreateProjModalOpen(false)}
        workspaceId={currentWs.id}
        workspaceName={currentWs.name}
        onSuccess={(key) => router.push(`/${orgSlug}/${workspaceSlug}/${key}`)}
      />
    </DashboardLayout>
  );
}
