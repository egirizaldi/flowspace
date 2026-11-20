'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ArrowRight, LayoutDashboard, User as UserIcon } from 'lucide-react';

export function HomeHeaderAuth() {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-3">
        <div className="h-8 w-20 rounded bg-muted animate-pulse" />
      </div>
    );
  }

  if (user) {
    return (
      <div className="flex items-center space-x-3">
        <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-surface px-2.5 py-1 rounded-full border border-border">
          <UserIcon className="w-3.5 h-3.5 text-primary" />
          <span className="truncate max-w-[120px] font-medium text-foreground">
            {user.name || user.email}
          </span>
        </span>
        <Link href="/organizations">
          <Button variant="default" size="sm" className="gap-1.5">
            <LayoutDashboard className="w-4 h-4" />
            <span>Go to Dashboard</span>
            <ArrowRight className="w-3.5 h-3.5 ml-0.5" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-3">
      <Link href="/organizations">
        <Button variant="outline" size="sm">
          Organizations
        </Button>
      </Link>
      <Link href="/login">
        <Button variant="ghost" size="sm">
          Sign In
        </Button>
      </Link>
      <Link href="/register">
        <Button variant="default" size="sm">
          Get Started <ArrowRight className="ml-1.5 h-4 w-4" />
        </Button>
      </Link>
    </div>
  );
}
