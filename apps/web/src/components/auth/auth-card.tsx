import * as React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FlowSpaceLogo } from '@/components/ui/flowspace-logo';

interface AuthCardProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footerText?: string;
  footerLinkText?: string;
  footerLinkHref?: string;
}

export function AuthCard({
  title,
  description,
  children,
  footerText,
  footerLinkText,
  footerLinkHref,
}: AuthCardProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        {/* Brand Logo Header */}
        <div className="flex flex-col items-center space-y-2 text-center">
          <Link href="/" className="inline-flex items-center group transition-opacity hover:opacity-90">
            <FlowSpaceLogo size={34} textClassName="text-xl font-bold" />
          </Link>
        </div>

        <Card className="border border-border/70 bg-surface/50 backdrop-blur-sm shadow-xl">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-medium tracking-tight text-foreground">
              {title}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">
              {description}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {children}

            {footerText && footerLinkText && footerLinkHref && (
              <div className="pt-2 text-center text-xs text-muted-foreground border-t border-border/40">
                {footerText}{' '}
                <Link
                  href={footerLinkHref}
                  className="font-medium text-primary hover:text-primary/80 transition-colors underline-offset-4 hover:underline"
                >
                  {footerLinkText}
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
