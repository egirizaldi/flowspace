'use client';

import React, { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Layers,
  Plus,
  Users,
  FolderKanban,
  ArrowRight,
  Shield,
  Loader2,
  Building2,
  UserPlus,
} from 'lucide-react';
import { useOrganizations, useOrganization } from '@/hooks/use-organization';
import { useOrganizationWorkspaces } from '@/hooks/use-workspace';
import { useOrganizationInvitations } from '@/hooks/use-invitation';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { CreateWorkspaceModal } from '@/components/workspaces/create-workspace-modal';
import { InviteMemberModal } from '@/components/invitations/invite-member-modal';
import { PendingInvitationsList } from '@/components/invitations/pending-invitations-list';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

interface PageProps {
  params: Promise<{ orgSlug: string }>;
}

export default function OrganizationOverviewPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const orgSlug = resolvedParams.orgSlug;
  const router = useRouter();

  const { data: organizations = [], isLoading: isOrgsLoading } = useOrganizations();
  const currentOrg = organizations.find((o) => o.slug === orgSlug);

  const { data: orgDetail, isLoading: isDetailLoading } = useOrganization(
    currentOrg?.id || null,
  );

  const { data: workspaces = [], isLoading: isWorkspacesLoading } =
    useOrganizationWorkspaces(currentOrg?.id || null);

  const { data: pendingInvitations = [] } = useOrganizationInvitations(
    currentOrg?.id || null,
  );

  const [createWsModalOpen, setCreateWsModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const isOwnerOrAdmin =
    currentOrg?.userRole === 'OWNER' || currentOrg?.userRole === 'ADMIN';

  if (isOrgsLoading || isDetailLoading) {
    return (
      <DashboardLayout activeOrgSlug={orgSlug}>
        <div className="h-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading organization...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!currentOrg) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center max-w-md mx-auto">
          <h2 className="text-lg font-semibold text-foreground">
            Organization not found
          </h2>
          <p className="text-sm text-muted-foreground mt-1 mb-4">
            The organization &quot;{orgSlug}&quot; could not be found or you do not have permission to view it.
          </p>
          <Button onClick={() => router.push('/organizations')}>
            Back to Organizations
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout activeOrgSlug={orgSlug}>
      <div className="space-y-8">
        {/* Organization Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold text-2xl shrink-0">
              {currentOrg.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-foreground">
                  {currentOrg.name}
                </h1>
                <Badge variant="outline" className="text-xs font-mono">
                  <Shield className="w-3 h-3 mr-1 text-primary" />
                  {currentOrg.userRole}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                /{currentOrg.slug}
              </p>
              {currentOrg.description && (
                <p className="text-sm text-muted-foreground mt-2 max-w-2xl">
                  {currentOrg.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
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
              onClick={() => setCreateWsModalOpen(true)}
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Workspace</span>
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Layers className="w-4 h-4 text-primary" /> Workspaces
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {workspaces.length}
              </CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription className="flex items-center gap-1.5 text-xs">
                <Users className="w-4 h-4 text-primary" /> Organization Members
              </CardDescription>
              <CardTitle className="text-2xl font-bold">
                {orgDetail?.members.length || currentOrg._count.members}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Workspaces Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Workspaces</h2>
            <span className="text-xs text-muted-foreground">
              {workspaces.length} workspace{workspaces.length !== 1 ? 's' : ''} available
            </span>
          </div>

          {workspaces.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-10 text-center bg-surface/40">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                No workspaces created yet
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                Workspaces house your projects, tasks, and sprint boards. Create your first workspace to start collaborating.
              </p>
              <Button onClick={() => setCreateWsModalOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                Create Workspace
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workspaces.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => router.push(`/${currentOrg.slug}/${ws.slug}`)}
                  className="group rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-border-focus transition-all p-5 cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="w-8 h-8 rounded-lg bg-surface-elevated text-primary flex items-center justify-center font-bold text-sm">
                        <Layers className="w-4 h-4" />
                      </div>
                      <Badge variant="outline" className="text-[10px] font-mono">
                        {ws.userRole}
                      </Badge>
                    </div>

                    <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {ws.name}
                    </h3>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">
                      /{currentOrg.slug}/{ws.slug}
                    </p>

                    {ws.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {ws.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <FolderKanban className="w-3.5 h-3.5" />
                        {ws._count.projects} projects
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {ws._count.members}
                      </span>
                    </div>
                    <span className="flex items-center gap-1 text-primary font-medium group-hover:translate-x-0.5 transition-transform">
                      Open <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Members Section */}
        {orgDetail && orgDetail.members && (
          <div className="space-y-4 pt-4 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground">
              Organization Members ({orgDetail.members.length})
            </h2>
            <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
              {orgDetail.members.map((m) => (
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
              organizationId={currentOrg.id}
              canManage={isOwnerOrAdmin}
            />
          </div>
        )}
      </div>

      <CreateWorkspaceModal
        isOpen={createWsModalOpen}
        onClose={() => setCreateWsModalOpen(false)}
        organizationId={currentOrg.id}
        organizationSlug={currentOrg.slug}
      />

      <InviteMemberModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        scope="organization"
        targetId={currentOrg.id}
        targetName={currentOrg.name}
      />
    </DashboardLayout>
  );
}
