'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Plus,
  Users,
  Layers,
  ArrowRight,
  Shield,
  Loader2,
} from 'lucide-react';
import { useOrganizations, UserOrganization } from '@/hooks/use-organization';
import { useCurrentUser } from '@/hooks/use-auth';
import { CreateOrganizationModal } from '@/components/organizations/create-organization-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FlowSpaceLogo } from '@/components/ui/flowspace-logo';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export default function OrganizationsPage() {
  const router = useRouter();
  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const { data: organizations = [], isLoading: isOrgsLoading } = useOrganizations();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  if (isUserLoading || isOrgsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading your organizations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center transition-opacity hover:opacity-90">
          <FlowSpaceLogo size={28} textClassName="text-base font-bold" />
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            Signed in as <strong className="text-foreground">{user?.email}</strong>
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 md:p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-border">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Select Organization
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Choose an organization to collaborate with your team and manage workspaces.
            </p>
          </div>
          <Button
            onClick={() => setCreateModalOpen(true)}
            className="flex items-center gap-2 self-start md:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Organization</span>
          </Button>
        </div>

        {/* Organizations List */}
        <div className="mt-8">
          {organizations.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-12 text-center bg-surface/50">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">
                No organizations found
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
                You don't belong to any organization yet. Create your first organization to get started with FlowSpace.
              </p>
              <Button onClick={() => setCreateModalOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Organization
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  onClick={() => router.push(`/${org.slug}`)}
                  className="group relative rounded-xl border border-border bg-surface hover:bg-surface-elevated hover:border-border-focus transition-all duration-200 p-5 cursor-pointer flex flex-col justify-between shadow-sm hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-base">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <Badge variant="outline" className="text-[11px] font-mono">
                        <Shield className="w-3 h-3 mr-1 text-primary" />
                        {org.userRole}
                      </Badge>
                    </div>

                    <h2 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                      {org.name}
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                      /{org.slug}
                    </p>

                    {org.description && (
                      <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {org.description}
                      </p>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        {org._count.members}
                      </span>
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" />
                        {org._count.workspaces}
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
      </main>

      <CreateOrganizationModal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
  );
}
