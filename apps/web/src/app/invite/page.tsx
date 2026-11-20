'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  useInvitationInfo,
  useAcceptInvitation,
} from '@/hooks/use-invitation';
import { useCurrentUser } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FlowSpaceLogo } from '@/components/ui/flowspace-logo';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import {
  Building2,
  Layers,
  Shield,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

function InviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { data: user, isLoading: isUserLoading } = useCurrentUser();
  const {
    data: inviteInfo,
    isLoading: isInfoLoading,
    error: infoError,
  } = useInvitationInfo(token);
  const acceptMutation = useAcceptInvitation();

  const [acceptError, setAcceptError] = useState<string | null>(null);

  if (!token) {
    return (
      <Card className="max-w-md w-full mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <CardTitle>Missing Invitation Token</CardTitle>
          <CardDescription>
            The invitation link is invalid or incomplete. Please check your invitation email.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/">
            <Button variant="outline">Return to Home</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (isInfoLoading || isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm">Verifying invitation...</p>
      </div>
    );
  }

  if (infoError || !inviteInfo) {
    return (
      <Card className="max-w-md w-full mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-status-danger/10 text-status-danger flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <CardTitle>Invalid or Expired Invitation</CardTitle>
          <CardDescription>
            This invitation token cannot be found or is no longer valid.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/">
            <Button variant="outline">Return to Home</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (inviteInfo.status !== 'PENDING' || inviteInfo.isExpired) {
    return (
      <Card className="max-w-md w-full mx-auto">
        <CardHeader className="text-center">
          <div className="w-12 h-12 rounded-full bg-status-warning/10 text-amber-500 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <CardTitle>
            {inviteInfo.status === 'ACCEPTED'
              ? 'Invitation Already Accepted'
              : 'Invitation Expired'}
          </CardTitle>
          <CardDescription>
            {inviteInfo.status === 'ACCEPTED'
              ? 'This invitation has already been accepted and cannot be reused.'
              : 'This invitation has expired. Please contact the inviter for a new invite.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Link href="/organizations">
            <Button>Go to Organizations</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const handleAccept = async () => {
    setAcceptError(null);
    try {
      await acceptMutation.mutateAsync(token);
      if (inviteInfo.workspace && inviteInfo.organization) {
        router.push(
          `/${inviteInfo.organization.slug}/${inviteInfo.workspace.slug}`,
        );
      } else if (inviteInfo.organization) {
        router.push(`/${inviteInfo.organization.slug}`);
      } else {
        router.push('/organizations');
      }
    } catch (err: any) {
      setAcceptError(err.message || 'Failed to accept invitation');
    }
  };

  const targetTitle =
    inviteInfo.workspace?.name ||
    inviteInfo.organization?.name ||
    'FlowSpace';

  return (
    <Card className="max-w-md w-full mx-auto shadow-xl border-border">
      <CardHeader className="text-center pb-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/20 text-primary flex items-center justify-center mx-auto mb-3">
          {inviteInfo.workspace ? (
            <Layers className="w-7 h-7" />
          ) : (
            <Building2 className="w-7 h-7" />
          )}
        </div>
        <CardTitle className="text-xl">You&apos;ve Been Invited!</CardTitle>
        <CardDescription className="text-xs mt-1">
          <strong className="text-foreground">{inviteInfo.inviter.name}</strong>{' '}
          has invited you to join{' '}
          <strong className="text-foreground">{targetTitle}</strong> on FlowSpace.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {acceptError && (
          <div className="p-3 text-xs rounded-md bg-status-danger/10 border border-status-danger/30 text-status-danger">
            {acceptError}
          </div>
        )}

        <div className="p-3.5 rounded-lg border border-border bg-surface-elevated space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Target Role</span>
            <Badge variant="outline" className="font-mono text-[10px]">
              <Shield className="w-3 h-3 mr-1 text-primary" />
              {inviteInfo.role}
            </Badge>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Invited Email</span>
            <span className="font-mono text-foreground">{inviteInfo.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Expires</span>
            <span className="text-muted-foreground">
              {new Date(inviteInfo.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {user ? (
          <div className="space-y-3 pt-2">
            <div className="text-center text-xs text-muted-foreground">
              Signed in as <strong className="text-foreground">{user.email}</strong>
            </div>
            <Button
              className="w-full flex items-center justify-center gap-2"
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
            >
              {acceptMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Accepting...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4" />
                  Accept Invitation & Join
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5 pt-2">
            <p className="text-xs text-center text-muted-foreground">
              You must be signed in to accept this invitation.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Link href={`/login?returnUrl=/invite?token=${token}`} className="flex-1">
                <Button variant="outline" className="w-full text-xs">
                  Sign In
                </Button>
              </Link>
              <Link href={`/register?returnUrl=/invite?token=${token}`} className="flex-1">
                <Button className="w-full text-xs">
                  Create Account
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function InvitePage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4">
      {/* Top FS Logo */}
      <div className="mb-6">
        <Link href="/" className="inline-flex items-center transition-opacity hover:opacity-90">
          <FlowSpaceLogo size={32} textClassName="text-lg font-bold" />
        </Link>
      </div>

      <Suspense
        fallback={
          <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm">Loading invitation...</p>
          </div>
        }
      >
        <InviteContent />
      </Suspense>
    </div>
  );
}
