'use client';

import React from 'react';
import {
  PendingInvitationItem,
  useRevokeInvitation,
} from '@/hooks/use-invitation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Clock, Trash2, Shield } from 'lucide-react';

interface PendingInvitationsListProps {
  invitations: PendingInvitationItem[];
  organizationId?: string;
  workspaceId?: string;
  canManage: boolean;
}

export function PendingInvitationsList({
  invitations,
  organizationId,
  workspaceId,
  canManage,
}: PendingInvitationsListProps) {
  const revokeMutation = useRevokeInvitation(organizationId, workspaceId);

  if (invitations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-8 text-center bg-surface/30">
        <Mail className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-xs text-muted-foreground">
          No pending invitations.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
      {invitations.map((inv) => (
        <div
          key={inv.id}
          className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-elevated transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{inv.email}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3 text-primary" /> {inv.role}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Expires {new Date(inv.expiresAt).toLocaleDateString()}
                </span>
                {inv.inviter && (
                  <>
                    <span>•</span>
                    <span>Invited by {inv.inviter.name}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => revokeMutation.mutate(inv.id)}
              disabled={revokeMutation.isPending}
              className="text-xs text-muted-foreground hover:text-status-danger self-end sm:self-auto"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Revoke
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
