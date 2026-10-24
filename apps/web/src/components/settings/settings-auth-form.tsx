import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { FormEvent } from 'react';

import { Button } from '@repo/ui/button';
import { Input } from '@repo/ui/input';

import type { AuthFormMode, AuthFormResult } from '#/features/auth/auth.type';
import {
  googleSignInErrorMessage,
  resendVerificationEmail,
  submitAuthForm,
} from '#/features/auth/auth-actions';
import { useGoogleSignIn } from '#/features/auth/auth-hooks';
import { isEmailPasswordAuthEnabled } from '#/features/auth/auth-session';
import type {
  SettingsAuthFieldProps,
  SettingsAuthFieldsProps,
  SettingsAuthFormProps,
  SettingsAuthModeLinksProps,
  SettingsGoogleSignInProps,
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

// Email and password is paused, so Google is the whole form unless it is turned back on.
export function SettingsAuthForm(props: SettingsAuthFormProps) {
  if (isEmailPasswordAuthEnabled()) return <SettingsEmailAuthForm {...props} />;
  return <SettingsGoogleAuth linkError={props.linkError} />;
}

// *** SettingsGoogleAuth ***
function SettingsGoogleAuth({
  linkError,
}: Pick<SettingsAuthFormProps, 'linkError'>) {
  const google = useGoogleSignIn();
  return (
    <section className="space-y-5" aria-labelledby="settings-auth-title">
      <h3 id="settings-auth-title" className="text-base font-medium">
        Sign in
      </h3>
      <SettingsGoogleSignIn
        google={google}
        linkError={linkError}
        showEmailDivider={false}
      />
    </section>
  );
}

// *** SettingsGoogleSignIn ***
function SettingsGoogleSignIn({
  google,
  linkError,
  showEmailDivider,
  disabled,
}: SettingsGoogleSignInProps) {
  const error =
    google.error ||
    (linkError && !google.pending ? googleSignInErrorMessage(linkError) : '');
  return (
    <div className="space-y-5">
      <Button
        id="settings-auth-google"
        type="button"
        variant="outline"
        disabled={disabled || google.pending}
        onClick={() =>
          void google.start(hrefWithoutSettings(window.location.href))
        }
        className="h-11 w-full gap-2.5"
      >
        <GoogleMark />
        {google.pending ? 'Connecting…' : 'Continue with Google'}
      </Button>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
      {showEmailDivider && (
        <div className="flex items-center gap-3 text-xs text-muted-fg">
          <span className="h-px flex-1 bg-border" />
          or use email
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
    </div>
  );
}

// *** GoogleMark ***
function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-4.5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}

// *** SettingsEmailAuthForm ***
function SettingsEmailAuthForm({
  mode,
  token,
  verified,
  linkError,
  onModeChange,
}: SettingsAuthFormProps) {
  const [email, setEmail] = useState('');
  const auth = useAuthFormState();
  const google = useGoogleSignIn();
  const pending = auth.pending || google.pending;
  const reduceMotion = useReducedMotion();
  const invalidResetLink =
    mode === 'reset-password' && (!token || Boolean(linkError));

  // *** handleSubmit ***
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
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
          {mode === 'sign-in' && (
            <SettingsGoogleSignIn
              google={google}
              linkError={verified ? undefined : linkError}
              showEmailDivider
              disabled={auth.pending}
            />
          )}
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
            <form onSubmit={handleSubmit} aria-busy={pending}>
              <SettingsAuthFields
                mode={mode}
                email={email}
                pending={pending}
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
