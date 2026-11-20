'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  FolderKanban,
  LogOut,
  Menu,
  X,
  User as UserIcon,
  Shield,
  Layers,
} from 'lucide-react';
import { useCurrentUser, useLogout } from '@/hooks/use-auth';
import { useOrganizations, UserOrganization } from '@/hooks/use-organization';
import {
  useOrganizationWorkspaces,
  OrganizationWorkspace,
} from '@/hooks/use-workspace';
import { OrgWorkspaceSwitcher } from '../navigation/org-workspace-switcher';
import { NotificationBell } from '../notifications/notification-bell';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeOrgSlug?: string;
  activeWorkspaceSlug?: string;
}

export function DashboardLayout({
  children,
  activeOrgSlug,
  activeWorkspaceSlug,
}: DashboardLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const logout = useLogout();

  const { data: organizations = [] } = useOrganizations();
  const activeOrg = organizations.find((o) => o.slug === activeOrgSlug) || null;

  const { data: workspaces = [] } = useOrganizationWorkspaces(
    activeOrg?.id || null,
  );
  const activeWorkspace =
    workspaces.find((w) => w.slug === activeWorkspaceSlug) || null;

  // Navigation Links
  const navItems = [
    {
      label: 'Organization Overview',
      href: activeOrg ? `/${activeOrg.slug}` : '/organizations',
      icon: LayoutDashboard,
      active: pathname === `/${activeOrg?.slug}`,
      show: Boolean(activeOrg),
    },
    {
      label: 'Workspace Overview',
      href:
        activeOrg && activeWorkspace
          ? `/${activeOrg.slug}/${activeWorkspace.slug}`
          : '#',
      icon: Layers,
      active:
        pathname === `/${activeOrg?.slug}/${activeWorkspace?.slug}`,
      show: Boolean(activeOrg && activeWorkspace),
    },
    {
      label: 'Workspace Settings',
      href:
        activeOrg && activeWorkspace
          ? `/${activeOrg.slug}/${activeWorkspace.slug}/settings`
          : '#',
      icon: Settings,
      active:
        pathname === `/${activeOrg?.slug}/${activeWorkspace?.slug}/settings`,
      show: Boolean(activeOrg && activeWorkspace),
    },
  ];

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* Mobile Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 border-r border-border bg-surface flex flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 flex items-center justify-between border-b border-border">
          <Link href="/organizations" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-black text-sm">
              FS
            </div>
            <span className="font-bold text-base tracking-tight text-foreground">
              FlowSpace
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden h-8 w-8 text-muted-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Organization & Workspace Switcher */}
        <OrgWorkspaceSwitcher
          organizations={organizations}
          workspaces={workspaces}
          activeOrganization={activeOrg}
          activeWorkspace={activeWorkspace}
        />

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-1">
          {navItems
            .filter((item) => item.show)
            .map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    item.active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-surface-elevated hover:text-foreground'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
        </nav>

        {/* User Footer */}
        <div className="p-3 border-t border-border bg-surface/40 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-xs font-semibold shrink-0">
              {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground truncate">
                {user?.name || 'Loading...'}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {user?.email || ''}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            title="Log Out"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="h-8 w-8 text-muted-foreground hover:text-status-danger"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="h-14 border-b border-border bg-surface/50 backdrop-blur-sm px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden h-8 w-8 text-muted-foreground"
            >
              <Menu className="w-4 h-4" />
            </Button>

            {/* Breadcrumb Navigation */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
              <Link
                href="/organizations"
                className="hover:text-foreground transition-colors"
              >
                Organizations
              </Link>
              {activeOrg && (
                <>
                  <span>/</span>
                  <Link
                    href={`/${activeOrg.slug}`}
                    className="hover:text-foreground transition-colors text-foreground font-semibold"
                  >
                    {activeOrg.name}
                  </Link>
                </>
              )}
              {activeWorkspace && (
                <>
                  <span>/</span>
                  <span className="text-primary font-semibold">
                    {activeWorkspace.name}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />

            {/* Role badge */}
            {activeWorkspace?.userRole ? (
              <Badge variant="outline" className="text-xs font-mono">
                <Shield className="w-3 h-3 mr-1 text-primary" />
                {activeWorkspace.userRole}
              </Badge>
            ) : activeOrg?.userRole ? (
              <Badge variant="outline" className="text-xs font-mono">
                <Shield className="w-3 h-3 mr-1 text-primary" />
                {activeOrg.userRole}
              </Badge>
            ) : null}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
