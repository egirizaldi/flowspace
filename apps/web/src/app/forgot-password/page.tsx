'use client';

import * as React from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { forgotPasswordSchema, ForgotPasswordInput } from '@flowspace/shared';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordInput) => {
    // Note: Backend email dispatcher is part of FS-019 (Password Reset API).
    // For now we simulate/prepare the client UX flow safely.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setSubmittedEmail(data.email);
  };

  if (submittedEmail) {
    return (
      <AuthCard
        title="Check your email"
        description="Password reset instructions have been sent"
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            If an account exists for <span className="font-medium text-foreground">{submittedEmail}</span>,
            you will receive an email with instructions to reset your password.
          </p>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center text-xs font-medium text-primary hover:text-primary/80 transition-colors gap-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Return to sign in
            </Link>
          </div>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Reset your password"
      description="Enter your email address and we'll send you a link to reset your password"
      footerText="Remember your password?"
      footerLinkText="Sign in"
      footerLinkHref="/login"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="name@company.com"
            autoComplete="email"
            disabled={isSubmitting}
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full mt-2"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending reset link...
            </>
          ) : (
            'Send Reset Link'
          )}
        </Button>
      </form>
    </AuthCard>
  );
}
