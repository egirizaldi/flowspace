'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  ChevronDown,
  Check,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { UserOrganization } from '@/hooks/use-organization';
import { OrganizationWorkspace } from '@/hooks/use-workspace';
import { CreateOrganizationModal } from '../organizations/create-organization-modal';
import { CreateWorkspaceModal } from '../workspaces/create-workspace-modal';

interface OrgWorkspaceSwitcherProps {
  organizations: UserOrganization[];
  workspaces: OrganizationWorkspace[];
  activeOrganization?: UserOrganization | null;
  activeWorkspace?: OrganizationWorkspace | null;
}

export function OrgWorkspaceSwitcher({
  organizations,
  workspaces,
  activeOrganization,
  activeWorkspace,
}: OrgWorkspaceSwitcherProps) {
  const router = useRouter();

  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);

  const [createOrgModalOpen, setCreateOrgModalOpen] = useState(false);
  const [createWsModalOpen, setCreateWsModalOpen] = useState(false);

  const orgRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (orgRef.current && !orgRef.current.contains(event.target as Node)) {
        setOrgDropdownOpen(false);
      }
      if (wsRef.current && !wsRef.current.contains(event.target as Node)) {
        setWsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectOrg = (org: UserOrganization) => {
    setOrgDropdownOpen(false);
    router.push(`/${org.slug}`);
  };

  const handleSelectWs = (ws: OrganizationWorkspace) => {
    setWsDropdownOpen(false);
    if (activeOrganization) {
      router.push(`/${activeOrganization.slug}/${ws.slug}`);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-2 border-b border-border">
      {/* Organization Switcher */}
      <div className="relative" ref={orgRef}>
        <button
          type="button"
          onClick={() => {
            setOrgDropdownOpen(!orgDropdownOpen);
            setWsDropdownOpen(false);
          }}
          className="w-full flex items-center justify-between p-2 rounded-lg bg-surface hover:bg-surface-elevated transition-colors border border-border text-left"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-md bg-primary/20 text-primary flex items-center justify-center font-bold text-xs shrink-0">
              {activeOrganization?.name ? (
                activeOrganization.name.charAt(0).toUpperCase()
              ) : (
                <Building2 className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                Organization
              </p>
              <p className="text-sm font-semibold text-foreground truncate">
                {activeOrganization?.name || 'Select Organization'}
              </p>
            </div>
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
        </button>

        {/* Org Dropdown */}
        {orgDropdownOpen && (
          <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-lg border border-border bg-surface-elevated shadow-xl p-1.5 space-y-1">
            <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your Organizations
            </div>
            <div className="max-h-56 overflow-y-auto space-y-0.5">
              {organizations.map((org) => {
                const isSelected = activeOrganization?.id === org.id;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => handleSelectOrg(org)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-md text-sm transition-colors text-left ${
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-foreground hover:bg-surface'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className="w-5 h-5 rounded bg-surface border border-border flex items-center justify-center text-xs font-bold shrink-0">
                        {org.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="truncate">{org.name}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="pt-1.5 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setOrgDropdownOpen(false);
                  setCreateOrgModalOpen(true);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md text-sm text-primary hover:bg-primary/10 transition-colors font-medium text-left"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Organization</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Workspace Switcher */}
      {activeOrganization && (
        <div className="relative" ref={wsRef}>
          <button
            type="button"
            onClick={() => {
              setWsDropdownOpen(!wsDropdownOpen);
              setOrgDropdownOpen(false);
            }}
            className="w-full flex items-center justify-between p-2 rounded-lg bg-surface/60 hover:bg-surface transition-colors border border-border/80 text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded bg-surface-elevated text-muted-foreground flex items-center justify-center shrink-0">
                <Layers className="w-3.5 h-3.5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                  Workspace
                </p>
                <p className="text-xs font-medium text-foreground truncate">
                  {activeWorkspace?.name || 'All Workspaces / Overview'}
                </p>
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-1" />
          </button>

          {/* WS Dropdown */}
          {wsDropdownOpen && (
            <div className="absolute left-0 right-0 top-full mt-1.5 z-40 rounded-lg border border-border bg-surface-elevated shadow-xl p-1.5 space-y-1">
              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Workspaces
              </div>
              <div className="max-h-56 overflow-y-auto space-y-0.5">
                {/* Organization Overview Option */}
                <button
                  type="button"
                  onClick={() => {
                    setWsDropdownOpen(false);
                    router.push(`/${activeOrganization.slug}`);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                    !activeWorkspace
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-foreground hover:bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Sparkles className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>Organization Overview</span>
                  </div>
                  {!activeWorkspace && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>

                {workspaces.map((ws) => {
                  const isSelected = activeWorkspace?.id === ws.id;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => handleSelectWs(ws)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left ${
                        isSelected
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-foreground hover:bg-surface'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Layers className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="truncate">{ws.name}</span>
                      </div>
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="pt-1.5 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    setWsDropdownOpen(false);
                    setCreateWsModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-primary hover:bg-primary/10 transition-colors font-medium text-left"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <CreateOrganizationModal
        isOpen={createOrgModalOpen}
        onClose={() => setCreateOrgModalOpen(false)}
      />

      {activeOrganization && (
        <CreateWorkspaceModal
          isOpen={createWsModalOpen}
          onClose={() => setCreateWsModalOpen(false)}
          organizationId={activeOrganization.id}
          organizationSlug={activeOrganization.slug}
        />
      )}
    </div>
  );
}
