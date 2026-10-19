import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { FormEvent } from 'react';

import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';

import type { AuthFormMode, AuthFormResult } from '#/features/auth/auth.type';
import {
  resendVerificationEmail,
  submitAuthForm,
} from '#/features/auth/auth-actions';
import type {
  SettingsAuthFieldProps,
  SettingsAuthFieldsProps,
  SettingsAuthFormProps,
  SettingsAuthModeLinksProps,
} from '#/features/settings/settings.type';
import { hrefWithoutSettings } from '#/features/settings/settings-search';

const RESEND_COOLDOWN_MS = 60_000;
const CONNECT_ERROR = 'Could not connect. Please try again.';
const MODE_ENTER = { duration: 0.2, ease: 'easeOut', delay: 0.1 } as const;
const MODE_EXIT = { duration: 0.12, ease: 'easeIn' } as const;
const NO_MOTION = { duration: 0 };

const copy: Record<AuthFormMode, { title: string; submit: string }> = {
  'sign-in': { title: 'Sign in', submit: 'Sign in' },
  'sign-up': { title: 'Create an account', submit: 'Create account' },
  'forgot-password': {
    title: 'Forgot your password?',
    submit: 'Send reset link',
  },
  'reset-password': {
    title: 'Choose a new password',
    submit: 'Reset password',
  },
};

export function SettingsAuthForm({
  mode,
  token,
  verified,
  linkError,
  onModeChange,
}: SettingsAuthFormProps) {
  const [email, setEmail] = useState('');
  const auth = useAuthFormState();
  const reduceMotion = useReducedMotion();
  const invalidResetLink =
    mode === 'reset-password' && (!token || Boolean(linkError));

  // *** handleSubmit ***
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (auth.pending) return;
    const form = new FormData(event.currentTarget);
    const result = await auth.run(() =>
      submitAuthForm(mode, {
        name: String(form.get('name') ?? '').trim(),
        email,
        password: String(form.get('password') ?? ''),
        token,
        returnTo: hrefWithoutSettings(window.location.href),
      }),
    );
    if (result?.nextMode) onModeChange(result.nextMode);
  }

  // *** changeMode ***
  function changeMode(next: AuthFormMode) {
    auth.reset();
    onModeChange(next);
  }

  return (
    <section className="relative" aria-labelledby="settings-auth-title">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={mode}
          className="space-y-5"
          initial={{ opacity: 0, y: 8 }}
          animate={{
            opacity: 1,
            y: 0,
            transition: reduceMotion ? NO_MOTION : MODE_ENTER,
          }}
          exit={{
            opacity: 0,
            y: -4,
            transition: reduceMotion ? NO_MOTION : MODE_EXIT,
          }}
        >
          <h3 id="settings-auth-title" className="text-base font-medium">
            {copy[mode].title}
          </h3>
          <SettingsAuthLinkStatus
            mode={mode}
            verified={verified}
            linkError={linkError}
          />
          {invalidResetLink ? (
            <p role="alert" className="text-sm">
              This reset link is missing or expired.{' '}
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={() => changeMode('forgot-password')}
              >
                Request a new link
              </button>
              .
            </p>
          ) : (
            <form onSubmit={handleSubmit} aria-busy={auth.pending}>
              <SettingsAuthFields
                mode={mode}
                email={email}
                pending={auth.pending}
                onEmailChange={(value) => {
                  setEmail(value);
                  auth.clearVerification();
                }}
              />
            </form>
          )}
          <SettingsAuthFeedback auth={auth} email={email} />
          <SettingsAuthModeLinks mode={mode} onModeChange={changeMode} />
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

// *** useAuthFormState ***
function useAuthFormState() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(false);

  useEffect(() => {
    if (!resendCooldown) return;
    const timer = window.setTimeout(
      () => setResendCooldown(false),
      RESEND_COOLDOWN_MS,
    );
    return () => window.clearTimeout(timer);
  }, [resendCooldown]);

  // *** run ***
  async function run(action: () => Promise<AuthFormResult>) {
    setPending(true);
    setError('');
    setMessage('');
    setNeedsVerification(false);
    try {
      const result = await action();
      setError(result.error ?? '');
      setMessage(result.message ?? '');
      setNeedsVerification(Boolean(result.needsVerification));
      return result;
    } catch {
      setError(CONNECT_ERROR);
      return undefined;
    } finally {
      setPending(false);
    }
  }

  // *** resend ***
  async function resend(email: string) {
    if (pending || resendCooldown) return;
    const result = await run(() => resendVerificationEmail(email));
    // The resend reply is a message, so keep the button visible for the cooldown.
    setNeedsVerification(true);
    if (result && !result.error) setResendCooldown(true);
  }

  // *** reset ***
  function reset() {
    setError('');
    setMessage('');
    setNeedsVerification(false);
  }

  return {
    pending,
    error,
    message,
    needsVerification,
    resendCooldown,
    run,
    resend,
    reset,
    clearVerification: () => setNeedsVerification(false),
  };
}

// *** SettingsAuthLinkStatus ***
function SettingsAuthLinkStatus({
  mode,
  verified,
  linkError,
}: Pick<SettingsAuthFormProps, 'mode' | 'verified' | 'linkError'>) {
  if (mode !== 'sign-in' || !verified) return null;
  if (linkError) {
    return (
      <p role="alert" className="text-sm text-danger">
        This verification link is invalid or expired. Sign in to request a new
        one.
      </p>
    );
  }
  return (
    <p role="status" className="text-sm">
      Your email is verified. You can sign in now.
    </p>
  );
}

// *** SettingsAuthFields ***
function SettingsAuthFields({
  mode,
  email,
  pending,
  onEmailChange,
}: SettingsAuthFieldsProps) {
  const isNewPassword = mode === 'sign-up' || mode === 'reset-password';
  return (
    <fieldset disabled={pending} className="space-y-4">
      {mode === 'sign-up' && (
        <SettingsAuthField id="settings-auth-name" label="Name">
          <Input
            id="settings-auth-name"
            name="name"
            required
            maxLength={100}
            autoComplete="name"
            className="h-11"
          />
        </SettingsAuthField>
      )}
      {mode !== 'reset-password' && (
        <SettingsAuthField id="settings-auth-email" label="Email">
          <Input
            id="settings-auth-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            spellCheck={false}
            value={email}
            onChange={(event) => onEmailChange(event.target.value)}
            className="h-11"
          />
        </SettingsAuthField>
      )}
      {mode !== 'forgot-password' && (
        <SettingsAuthField id="settings-auth-password" label="Password">
          <Input
            id="settings-auth-password"
            name="password"
            type="password"
            required
            minLength={isNewPassword ? 12 : undefined}
            maxLength={128}
            autoComplete={isNewPassword ? 'new-password' : 'current-password'}
            aria-describedby={
              isNewPassword ? 'settings-auth-password-help' : undefined
            }
            className="h-11"
          />
          {isNewPassword && (
            <p
              id="settings-auth-password-help"
              className="text-xs text-muted-fg"
            >
              Use at least 12 characters.
            </p>
          )}
        </SettingsAuthField>
      )}
      <Button type="submit" disabled={pending} className="h-11 w-full">
        {pending ? 'Please wait…' : copy[mode].submit}
      </Button>
    </fieldset>
  );
}

// *** SettingsAuthField ***
function SettingsAuthField({ id, label, children }: SettingsAuthFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm">
        {label}
      </label>
      {children}
    </div>
  );
}

// *** SettingsAuthFeedback ***
function SettingsAuthFeedback({
  auth,
  email,
}: {
  auth: ReturnType<typeof useAuthFormState>;
  email: string;
}) {
  return (
    <>
      {auth.error && (
        <p role="alert" className="text-sm text-danger">
          {auth.error}
        </p>
      )}
      {auth.message && (
        <p role="status" className="text-sm">
          {auth.message}
        </p>
      )}
      {auth.needsVerification && (
        <Button
          type="button"
          variant="outline"
          disabled={auth.pending || auth.resendCooldown}
          onClick={() => void auth.resend(email)}
          className="h-11 w-full"
        >
          {auth.resendCooldown
            ? 'You can resend in a minute'
            : 'Resend verification email'}
        </Button>
      )}
    </>
  );
}

// *** SettingsAuthModeLinks ***
function SettingsAuthModeLinks({
  mode,
  onModeChange,
}: SettingsAuthModeLinksProps) {
  const links: { mode: AuthFormMode; label: string }[] =
    mode === 'sign-in'
      ? [
          { mode: 'sign-up', label: 'Create an account' },
          { mode: 'forgot-password', label: 'Forgot password?' },
        ]
      : [{ mode: 'sign-in', label: 'Back to sign in' }];

  return (
    <nav
      className="flex flex-wrap gap-x-5 gap-y-3 text-sm"
      aria-label="Account"
    >
      {links.map((link) => (
        <button
          key={link.mode}
          type="button"
          className="py-1 text-muted-fg underline underline-offset-4 hover:text-fg"
          onClick={() => onModeChange(link.mode)}
        >
          {link.label}
        </button>
      ))}
    </nav>
  );
}
