import { redirect } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server';
import { z } from 'zod';

import {
  getStorageAccount,
  setStorageAccount,
} from '#/features/storage/storage-account';

// Guests are not sent to sign-in: they keep using this device's local data.
export async function loadPageSession(returnTo: string) {
  const user = await getAuthSession();

  if (typeof window !== 'undefined') {
    const previousAccount = getStorageAccount();
    if (previousAccount && previousAccount !== user?.id) {
      // Reload so pending local writes cannot cross account boundaries.
      throw redirect({ href: safeReturnTo(returnTo), reloadDocument: true });
    }

    if (user) setStorageAccount(user.id);
  }

  return { authUser: user };
}

// *** getAuthSession ***
const getAuthSession = createServerFn({ method: 'GET' }).handler(async () => {
  setResponseHeader('Cache-Control', 'private, no-store');

  // Development runs as a guest so it works without the auth API.
  if (isDevAuthBypass()) return null;

  const origin = process.env.API_ORIGIN ?? 'http://localhost:4000';
  const response = await fetch(
    `${origin}/api/auth/get-session?disableRefresh=true`,
    {
      headers: { cookie: getRequestHeader('cookie') ?? '' },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok)
    throw new Error('Could not check your session. Please try again.');
  const session: unknown = await response.json();
  if (session === null) return null;
  return z.object({ user: authUserSchema }).parse(session).user;
});

// *** isDevAuthBypass ***
function isDevAuthBypass() {
  return (
    import.meta.env.DEV === true &&
    import.meta.env.VITE_DEV_AUTH_BYPASS !== 'false'
  );
}

// *** authUserSchema ***
const authUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
});

// *** safeReturnTo ***
export function safeReturnTo(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    [...value].some((character) => character.charCodeAt(0) <= 32)
  )
    return '/library';
  const url = new URL(value, 'https://mado.invalid');
  if (!/^\/(library|collection)(\/|$)/.test(url.pathname)) return '/library';
  return `${url.pathname}${url.search}${url.hash}`;
}

export { isDevAuthBypass };
