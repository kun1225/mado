import { afterEach, describe, expect, it, vi } from 'vitest';

import { visibleSettingsTabs } from './settings-tabs';

describe('visibleSettingsTabs', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('shows every tab while a sign-in method is on', () => {
    vi.stubEnv('VITE_FLAG_AUTH_GOOGLE', 'true');
    vi.stubEnv('VITE_FLAG_AUTH_EMAIL_PASSWORD', 'false');
    expect(visibleSettingsTabs(false)).toEqual([
      'general',
      'account',
      'data',
      'feedback',
    ]);
  });

  it('hides the account tab from guests when every sign-in method is off', () => {
    vi.stubEnv('VITE_FLAG_AUTH_GOOGLE', 'false');
    vi.stubEnv('VITE_FLAG_AUTH_EMAIL_PASSWORD', 'false');
    expect(visibleSettingsTabs(false)).toEqual(['general', 'data', 'feedback']);
  });

  it('keeps the account tab for a signed-in user', () => {
    vi.stubEnv('VITE_FLAG_AUTH_GOOGLE', 'false');
    vi.stubEnv('VITE_FLAG_AUTH_EMAIL_PASSWORD', 'false');
    expect(visibleSettingsTabs(true)).toEqual([
      'general',
      'account',
      'data',
      'feedback',
    ]);
  });
});
