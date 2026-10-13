import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { FormEvent } from 'react';

import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';

import type { AuthFormResult, AuthPageProps } from '#/features/auth/auth.type';
import {
  resendVerificationEmail,
  submitAuthForm,
} from '#/features/auth/auth-actions';

const copy = {
  'sign-in': { title: 'Welcome back', submit: 'Sign in' },
  'sign-up': { title: 'Create your account', submit: 'Create account' },
  'forgot-password': {
    title: 'Forgot your password?',
    submit: 'Send reset link',
  },
  'reset-password': {
    title: 'Choose a new password',
    submit: 'Reset password',
  },
};

export function AuthPage({
  mode,
  returnTo,
  token,
  error: linkError,
}: AuthPageProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [email, setEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(false);

  useEffect(() => {
    if (!resendCooldown) return;
    const timer = window.setTimeout(() => setResendCooldown(false), 60_000);
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);
  const isReset = mode === 'reset-password';
  const invalidLink = isReset && (!token || Boolean(linkError));

  // *** handleSubmit ***
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const form = new FormData(event.currentTarget);
    setNeedsVerification(false);
    const result = await runAction(() =>
      submitAuthForm(mode, {
        name: String(form.get('name') ?? '').trim(),
        email,
        password: String(form.get('password') ?? ''),
        token,
        returnTo,
      }),
    );
    setNeedsVerification(Boolean(result?.needsVerification));
  }

  // *** runAction ***
  async function runAction(action: () => Promise<AuthFormResult>) {
    setPending(true);
    setError('');
    setMessage('');
    try {
      const result = await action();
      setError(result.error ?? '');
      setMessage(result.message ?? '');
      return result;
    } catch {
      setError('Could not connect. Please try again.');
      return undefined;
    } finally {
      setPending(false);
    }
  }

  // *** resendVerification ***
  async function resendVerification() {
    if (pending || resendCooldown) return;
    const result = await runAction(() => resendVerificationEmail(email));
    if (result && !result.error) setResendCooldown(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 py-12">
      <section
        className="w-full max-w-sm space-y-6"
        aria-labelledby="auth-title"
      >
        <div className="space-y-2">
          <p className="text-sm text-muted-fg">Mado</p>
          <h1 id="auth-title" className="text-2xl font-medium">
            {copy[mode].title}
          </h1>
          <p className="text-sm text-muted-fg">
            {mode === 'sign-up'
              ? 'Your saves stay on this device. Each account has its own library.'
              : 'Your space for things worth keeping.'}
          </p>
        </div>
        {invalidLink ? (
          <p role="alert">
            This reset link is missing or expired.{' '}
            <Link to="/forgot-password" className="underline">
              Request a new link
            </Link>
            .
          </p>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
            aria-busy={pending}
          >
            <fieldset disabled={pending} className="space-y-4">
              {mode === 'sign-up' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-name" className="text-sm">
                    Name
                  </label>
                  <Input
                    id="auth-name"
                    name="name"
                    required
                    maxLength={100}
                    autoComplete="name"
                    className="h-11"
                  />
                </div>
              )}
              {!isReset && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-email" className="text-sm">
                    Email
                  </label>
                  <Input
                    id="auth-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    spellCheck={false}
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setNeedsVerification(false);
                    }}
                    className="h-11"
                  />
                </div>
              )}
              {mode !== 'forgot-password' && (
                <div className="space-y-1.5">
                  <label htmlFor="auth-password" className="text-sm">
                    Password
                  </label>
                  <Input
                    id="auth-password"
                    name="password"
                    type="password"
                    required
                    minLength={mode === 'sign-in' ? undefined : 12}
                    maxLength={128}
                    autoComplete={
                      mode === 'sign-in' ? 'current-password' : 'new-password'
                    }
                    aria-describedby={
                      mode === 'sign-in' ? undefined : 'password-help'
                    }
                    className="h-11"
                  />
                  {mode !== 'sign-in' && (
                    <p id="password-help" className="text-xs text-muted-fg">
                      Use at least 12 characters.
                    </p>
                  )}
                </div>
              )}
              <Button type="submit" disabled={pending} className="h-11 w-full">
                {pending ? 'Please wait…' : copy[mode].submit}
              </Button>
            </fieldset>
          </form>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
        {needsVerification && (
          <Button
            type="button"
            variant="outline"
            disabled={pending || resendCooldown}
            onClick={() => void resendVerification()}
            className="h-11 w-full"
          >
            {resendCooldown
              ? 'You can resend in a minute'
              : 'Resend verification email'}
          </Button>
        )}
        <nav
          className="flex flex-wrap gap-x-5 gap-y-3 text-sm"
          aria-label="Account"
        >
          {mode !== 'sign-in' && (
            <Link to="/sign-in" className="underline underline-offset-4">
              Sign in
            </Link>
          )}
          {mode === 'sign-in' && (
            <>
              <Link to="/sign-up" className="underline underline-offset-4">
                Create account
              </Link>
              <Link
                to="/forgot-password"
                className="underline underline-offset-4"
              >
                Forgot password?
              </Link>
            </>
          )}
        </nav>
      </section>
    </main>
  );
}
