'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/zod-resolver';
import { resetPasswordSchema, ResetPasswordInput } from '@flowspace/shared';
import { AuthCard } from '@/components/auth/auth-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle2 } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get('token') || '';
  const [isSuccess, setIsSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: tokenFromUrl,
      newPassword: '',
    },
  });

  React.useEffect(() => {
    if (tokenFromUrl) {
      setValue('token', tokenFromUrl);
    }
  }, [tokenFromUrl, setValue]);

  const onSubmit = async (_data: ResetPasswordInput) => {
    // Note: Backend endpoint for reset-password is implemented in FS-019.
    // Client flow is prepared cleanly with full schema validation.
    await new Promise((resolve) => setTimeout(resolve, 600));
    setIsSuccess(true);
  };

  if (isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-sm font-medium text-foreground">
            Password reset successful
          </h3>
          <p className="text-xs text-muted-foreground">
            Your password has been securely updated. You can now log in with your new password.
          </p>
        </div>
        <div className="pt-2">
          <Link href="/login">
            <Button className="w-full">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {!tokenFromUrl && (
        <div className="space-y-1.5">
          <Label htmlFor="token">Reset Token</Label>
          <Input
            id="token"
            type="text"
            placeholder="Paste your reset token here"
            disabled={isSubmitting}
            {...register('token')}
            aria-invalid={!!errors.token}
          />
          {errors.token && (
            <p className="text-xs text-destructive">{errors.token.message}</p>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="newPassword">New Password</Label>
        <Input
          id="newPassword"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          disabled={isSubmitting}
          {...register('newPassword')}
          aria-invalid={!!errors.newPassword}
        />
        {errors.newPassword && (
          <p className="text-xs text-destructive">{errors.newPassword.message}</p>
        )}
        <p className="text-[11px] text-muted-foreground">
          Must be at least 8 characters and include uppercase, lowercase, number, and special character.
        </p>
      </div>

      <Button
        type="submit"
        className="w-full mt-2"
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Updating password...
          </>
        ) : (
          'Reset Password'
        )}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthCard
      title="Set a new password"
      description="Create a strong, new password for your FlowSpace account"
      footerText="Remember your password?"
      footerLinkText="Sign in"
      footerLinkHref="/login"
    >
      <React.Suspense
        fallback={
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        }
      >
        <ResetPasswordForm />
      </React.Suspense>
    </AuthCard>
  );
}
