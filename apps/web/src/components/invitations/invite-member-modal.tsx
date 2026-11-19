'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { createInvitationSchema } from '@flowspace/shared';
import { zodResolver } from '@/lib/zod-resolver';
import {
  useInviteOrganizationMember,
  useInviteWorkspaceMember,
} from '@/hooks/use-invitation';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Check, Copy, Mail, Shield } from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: 'organization' | 'workspace';
  targetId: string;
  targetName: string;
}

interface FormData {
  email: string;
  role: string;
}

export function InviteMemberModal({
  isOpen,
  onClose,
  scope,
  targetId,
  targetName,
}: InviteMemberModalProps) {
  const inviteOrg = useInviteOrganizationMember(targetId);
  const inviteWs = useInviteWorkspaceMember(targetId);

  const [serverError, setServerError] = useState<string | null>(null);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(createInvitationSchema),
    defaultValues: {
      email: '',
      role: 'MEMBER',
    },
  });

  const onSubmit = async (data: FormData) => {
    setServerError(null);
    setCreatedInviteLink(null);
    try {
      let result;
      if (scope === 'organization') {
        result = await inviteOrg.mutateAsync({
          email: data.email,
          role: data.role,
        });
      } else {
        result = await inviteWs.mutateAsync({
          email: data.email,
          role: data.role,
        });
      }

      const rawToken = result.rawToken;
      const link = `${window.location.origin}/invite?token=${rawToken}`;
      setCreatedInviteLink(link);
      reset();
    } catch (err: any) {
      setServerError(err.message || 'Failed to send invitation');
    }
  };

  const handleCopy = () => {
    if (createdInviteLink) {
      navigator.clipboard.writeText(createdInviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setCreatedInviteLink(null);
    setServerError(null);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Invite to ${targetName}`}
      description={`Invite a team member to join this ${scope}.`}
    >
      {createdInviteLink ? (
        <div className="space-y-4">
          <div className="p-3 text-xs rounded-md bg-status-success/10 border border-status-success/30 text-status-success font-medium">
            Invitation created successfully! You can share the invitation link below:
          </div>

          <div className="space-y-1.5">
            <Label>Invitation Link</Label>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={createdInviteLink}
                className="bg-surface-elevated font-mono text-xs select-all text-muted-foreground"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                title="Copy link"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-status-success" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={handleClose}>Done</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {serverError && (
            <div className="p-3 text-xs rounded-md bg-status-danger/10 border border-status-danger/30 text-status-danger">
              {serverError}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="invitee-email">Email Address</Label>
            <Input
              id="invitee-email"
              placeholder="colleague@example.com"
              type="email"
              {...register('email')}
              aria-invalid={Boolean(errors.email)}
            />
            {errors.email && (
              <p className="text-xs text-status-danger mt-1">
                {errors.email.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="invitee-role">Role</Label>
            <select
              id="invitee-role"
              {...register('role')}
              className="w-full h-9 rounded-md border border-border bg-surface px-3 py-1 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
            >
              <option value="MEMBER">Member (Standard access)</option>
              <option value="ADMIN">Admin (Manage settings & members)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
