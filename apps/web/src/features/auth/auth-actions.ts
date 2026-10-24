import type { AuthFormInput, AuthFormMode, AuthFormResult } from './auth.type';
import { authClient } from './auth-client';
import { safeReturnTo } from './auth-session';

const TOO_MANY_TRIES = 'Too many tries. Please wait a minute.';
const GOOGLE_FAILED = 'Could not sign in with Google. Please try again.';

// Fixed copy only, because the URL error code comes from outside the app.
const GOOGLE_ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Google sign-in was canceled. Please try again.',
  account_not_linked:
    'This email already has an unfinished Mado account. Contact support.',
};

export async function signInWithGoogle(
  returnTo: string,
): Promise<AuthFormResult> {
  const callbackURL = new URL(safeReturnTo(returnTo), window.location.origin);
  const errorCallbackURL = new URL(callbackURL);
  errorCallbackURL.searchParams.set('settings', 'account');
  const result = await authClient.signIn.social({
    provider: 'google',
    callbackURL: callbackURL.href,
    errorCallbackURL: errorCallbackURL.href,
  });
  if (result.error)
    return { error: rateLimitedOr(result.error.status, GOOGLE_FAILED) };
  return {};
}

export function googleSignInErrorMessage(code: string): string {
  return Object.hasOwn(GOOGLE_ERROR_MESSAGES, code)
    ? GOOGLE_ERROR_MESSAGES[code]
    : GOOGLE_FAILED;
}

export function submitAuthForm(
  mode: AuthFormMode,
  input: AuthFormInput,
): Promise<AuthFormResult> {
  return submitByMode[mode](input);
}

export async function resendVerificationEmail(
  email: string,
): Promise<AuthFormResult> {
  const result = await authClient.sendVerificationEmail({
    email,
    callbackURL: verifyEmailCallbackUrl(),
  });
  if (result.error) {
    return {
      error: 'Could not send the link. Please wait a minute and try again.',
    };
  }
  return {
    message:
      'If this account needs verification, a new link is on its way. You can request another in one minute.',
  };
}

// *** submitByMode ***
const submitByMode: Record<
  AuthFormMode,
  (input: AuthFormInput) => Promise<AuthFormResult>
> = {
  // *** signIn ***
  'sign-in': async ({ email, password, returnTo }) => {
    const result = await authClient.signIn.email({ email, password });
    if (result.error) {
      return {
        error: rateLimitedOr(
          result.error.status,
          'Check your email and password. Verify your email before signing in.',
        ),
        needsVerification: result.error.code === 'EMAIL_NOT_VERIFIED',
      };
    }
    window.location.assign(safeReturnTo(returnTo));
    return {};
  },

  // *** signUp ***
  // A used email gets the same reply as a new one, so nobody can learn who has an account.
  'sign-up': async ({ name, email, password }) => {
    const result = await authClient.signUp.email({
      name,
      email,
      password,
      callbackURL: verifyEmailCallbackUrl(),
    });
    if (
      result.error &&
      result.error.code !== 'USER_ALREADY_EXISTS' &&
      result.error.code !== 'USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL'
    ) {
      return {
        error: rateLimitedOr(
          result.error.status,
          'Could not create your account. Please try again.',
        ),
      };
    }
    return {
      needsVerification: true,
      message:
        'If this email can be registered, a verification link is on its way. Check your inbox, then sign in.',
    };
  },

  // *** requestPasswordReset ***
  'forgot-password': async ({ email }) => {
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/library?settings=account&auth=reset-password`,
    });
    if (result.error) {
      return {
        error:
          result.error.status === 429
            ? 'Please wait a minute before requesting another link.'
            : 'Could not send the link. Please try again.',
      };
    }
    return {
      message: 'If an account uses this email, a reset link is on its way.',
    };
  },

  // *** resetPassword ***
  'reset-password': async ({ password, token }) => {
    const result = await authClient.resetPassword({
      newPassword: password,
      token,
    });
    if (result.error) {
      return {
        error: 'This reset link may have expired. Please request a new one.',
      };
    }
    return {
      message: 'Your password is changed. Sign in with the new one.',
      nextMode: 'sign-in',
    };
  },
};

// *** rateLimitedOr ***
function rateLimitedOr(status: number, fallback: string) {
  return status === 429 ? TOO_MANY_TRIES : fallback;
}

// *** verifyEmailCallbackUrl ***
function verifyEmailCallbackUrl() {
  return `${window.location.origin}/library?settings=account&verified=true`;
}
