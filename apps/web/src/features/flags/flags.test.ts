import { afterEach, describe, expect, it, vi } from 'vitest';

import { isFlagOn } from './flags';

describe('feature flags', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('uses the default when a flag is not set', () => {
    vi.stubEnv('VITE_FLAG_AUTH_GOOGLE', undefined);
    vi.stubEnv('VITE_FLAG_AUTH_EMAIL_PASSWORD', undefined);
    expect(isFlagOn('authGoogle')).toBe(true);
    expect(isFlagOn('authEmailPassword')).toBe(false);
  });

  it('turns a flag on or off with true or false', () => {
    vi.stubEnv('VITE_FLAG_AUTH_GOOGLE', 'false');
    expect(isFlagOn('authGoogle')).toBe(false);
    vi.stubEnv('VITE_FLAG_AUTH_EMAIL_PASSWORD', 'true');
    expect(isFlagOn('authEmailPassword')).toBe(true);
  });

  it('ignores any other value and keeps the default', () => {
    vi.stubEnv('VITE_FLAG_AUTH_GOOGLE', 'no');
    vi.stubEnv('VITE_FLAG_AUTH_EMAIL_PASSWORD', 'yes');
    expect(isFlagOn('authGoogle')).toBe(true);
    expect(isFlagOn('authEmailPassword')).toBe(false);
  });
});
