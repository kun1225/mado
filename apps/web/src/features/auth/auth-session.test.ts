import { afterEach, describe, expect, it, vi } from 'vitest';

import { isDevAuthBypass, safeReturnTo } from './auth-session';

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
