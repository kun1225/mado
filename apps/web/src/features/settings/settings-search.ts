import { z } from 'zod';

import { AUTH_FORM_MODES } from '#/features/auth/auth.type';

import type { SettingsSearch } from './settings.type';
import { SETTINGS_TABS } from './settings.type';

// Email links land on these keys, so they must stay stable once emails are sent.
const SETTINGS_SEARCH_KEYS: ReadonlySet<string> = new Set([
  'settings',
  'auth',
  'token',
  'verified',
  'error',
]);

export function parseSettingsSearch(
  search: Record<string, unknown>,
): SettingsSearch {
  const value = settingsSearchSchema.parse(search);
  return {
    tab: value.settings ?? null,
    authMode: value.auth ?? 'sign-in',
    token: value.token,
    verified: value.verified !== undefined,
    error: value.error,
  };
}

export function withoutSettingsSearch(
  search: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(search).filter(([key]) => !SETTINGS_SEARCH_KEYS.has(key)),
  );
}

export function hrefWithoutSettings(href: string): string {
  const url = new URL(href, 'https://mado.invalid');
  const params = new URLSearchParams(
    [...url.searchParams].filter(([key]) => !SETTINGS_SEARCH_KEYS.has(key)),
  ).toString();
  return `${url.pathname}${params ? `?${params}` : ''}${url.hash}`;
}

// *** settingsSearchSchema ***
// Bad values fall back instead of throwing, because anyone can edit the URL.
const settingsSearchSchema = z.object({
  settings: z.enum(SETTINGS_TABS).optional().catch(undefined),
  auth: z.enum(AUTH_FORM_MODES).optional().catch(undefined),
  token: z.string().optional().catch(undefined),
  verified: z
    .union([z.literal('true'), z.literal(true)])
    .optional()
    .catch(undefined),
  error: z.string().optional().catch(undefined),
});
