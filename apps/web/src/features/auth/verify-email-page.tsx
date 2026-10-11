import { Link } from '@tanstack/react-router';

import type { AuthVerifyEmailProps } from './auth.type';

export function VerifyEmailPage({ verified, error }: AuthVerifyEmailProps) {
  const success = verified && !error;
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <section className="w-full max-w-sm space-y-4">
        <h1 className="text-2xl font-medium">
          {success ? 'Email verified' : 'Verify your email'}
        </h1>
        <p className="text-sm text-muted-fg">
          {success
            ? 'You can now sign in to Mado.'
            : error
              ? 'This verification link is invalid or expired. Sign in to request a new one.'
              : 'Open the verification link in your inbox, then sign in.'}
        </p>
        <Link
          to="/sign-in"
          className="inline-block py-3 underline underline-offset-4"
        >
          Go to sign in
        </Link>
      </section>
    </main>
  );
}
