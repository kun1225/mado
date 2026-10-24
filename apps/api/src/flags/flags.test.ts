import { describe, expect, it } from 'vitest';

import { readFlags } from './flags.js';

describe('feature flags', () => {
  it('uses the defaults when no flag is set', () => {
    expect(readFlags({})).toEqual({
      authGoogle: true,
      authEmailPassword: false,
    });
  });

  it('turns flags on or off with true or false', () => {
    expect(
      readFlags({
        FLAG_AUTH_GOOGLE: 'false',
        FLAG_AUTH_EMAIL_PASSWORD: 'true',
      }),
    ).toEqual({ authGoogle: false, authEmailPassword: true });
  });

  it('rejects any other value so a typo cannot open a feature', () => {
    expect(() => readFlags({ FLAG_AUTH_GOOGLE: 'no' })).toThrow(
      'FLAG_AUTH_GOOGLE',
    );
  });
});
