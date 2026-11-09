import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  isDevAuthBypass,
  isSignInOn,
  safeReturnTo,
  shouldSkipSessionCheck,
} from './auth-session';

describe('safe return paths', () => {
  it.each(['/library', '/library/deleted', '/collection/abc?view=grid#top'])(
    'keeps the local app path %s',
    (path) => expect(safeReturnTo(path)).toBe(path),
  );
  it.each([
    undefined,
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/sign-in',
    '/library/../../sign-in',
    '/library/%2e%2e/sign-in',
    '/library\n',
    '/library-backup',
  ])('rejects unsafe or unrelated paths %s', (path) =>
    expect(safeReturnTo(path)).toBe('/library'),
  );
});

describe('development login bypass', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('runs as a guest on local data during development', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'true');
    expect(isDevAuthBypass()).toBe(true);
  });

  it('can be disabled to test real login', () => {
    vi.stubEnv('DEV', true);
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'false');
    expect(isDevAuthBypass()).toBe(false);
  });

  it('cannot be enabled in production', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_DEV_AUTH_BYPASS', 'true');
    expect(isDevAuthBypass()).toBe(false);
  });
});

describe('sign-in switch', () => {
  afterEach(() => vi.unstubAllEnvs());

  function stubSignInFlags(google: string, emailPassword: string) {
    vi.stubEnv('VITE_FLAG_AUTH_GOOGLE', google);
    vi.stubEnv('VITE_FLAG_AUTH_EMAIL_PASSWORD', emailPassword);
  }

  it('is off when every sign-in flag is off', () => {
    stubSignInFlags('false', 'false');
    expect(isSignInOn()).toBe(false);
  });

  it.each([
    ['true', 'false'],
    ['false', 'true'],
  ])('is on when any sign-in flag is on (google %s, email %s)', (g, e) => {
    stubSignInFlags(g, e);
    expect(isSignInOn()).toBe(true);
  });
});

describe('session check skip', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('skips the API in production when sign-in is off', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_FLAG_AUTH_GOOGLE', 'false');
    vi.stubEnv('VITE_FLAG_AUTH_EMAIL_PASSWORD', 'false');
    expect(shouldSkipSessionCheck()).toBe(true);
  });

  it('asks the API in production when sign-in is on', () => {
    vi.stubEnv('DEV', false);
    vi.stubEnv('VITE_FLAG_AUTH_GOOGLE', 'true');
    expect(shouldSkipSessionCheck()).toBe(false);
  });
});
