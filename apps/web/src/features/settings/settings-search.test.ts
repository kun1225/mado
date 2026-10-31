import { describe, expect, it } from 'vitest';

import {
  hrefWithoutSettings,
  parseSettingsSearch,
  withoutSettingsSearch,
} from './settings-search';

describe('parseSettingsSearch', () => {
  it('is closed with the sign-in form when nothing is set', () => {
    expect(parseSettingsSearch({})).toEqual({
      tab: null,
      authMode: 'sign-in',
      token: undefined,
      verified: false,
      error: undefined,
    });
  });

  it('reads a reset-password link', () => {
    expect(
      parseSettingsSearch({
        settings: 'account',
        auth: 'reset-password',
        token: 'abc',
      }),
    ).toMatchObject({
      tab: 'account',
      authMode: 'reset-password',
      token: 'abc',
    });
  });

  it('opens the data tab', () => {
    expect(parseSettingsSearch({ settings: 'data' }).tab).toBe('data');
  });

  it('opens the shortcuts tab', () => {
    expect(parseSettingsSearch({ settings: 'shortcuts' }).tab).toBe(
      'shortcuts',
    );
  });

  it('opens the general tab', () => {
    expect(parseSettingsSearch({ settings: 'general' }).tab).toBe('general');
  });

  it('accepts verified as a string or a boolean', () => {
    expect(parseSettingsSearch({ verified: 'true' }).verified).toBe(true);
    expect(parseSettingsSearch({ verified: true }).verified).toBe(true);
  });

  it('drops values it does not know', () => {
    expect(
      parseSettingsSearch({
        settings: 'billing',
        auth: 'magic',
        token: 42,
        verified: 'yes',
        error: {},
      }),
    ).toEqual({
      tab: null,
      authMode: 'sign-in',
      token: undefined,
      verified: false,
      error: undefined,
    });
  });
});

describe('withoutSettingsSearch', () => {
  it('removes only the settings keys', () => {
    const search = {
      source: 's1',
      settings: 'account',
      auth: 'sign-up',
      token: 't',
      verified: true,
      error: 'INVALID_TOKEN',
      error_description: 'raw provider text',
    };
    expect(withoutSettingsSearch(search)).toEqual({ source: 's1' });
    expect(search.settings).toBe('account');
  });
});

describe('hrefWithoutSettings', () => {
  it('keeps the path, other params and the hash', () => {
    expect(
      hrefWithoutSettings(
        '/collection/c1?settings=account&source=s1&auth=sign-in#top',
      ),
    ).toBe('/collection/c1?source=s1#top');
  });

  it('drops the raw Google error text with the error code', () => {
    expect(
      hrefWithoutSettings(
        '/library?settings=account&error=access_denied&error_description=raw',
      ),
    ).toBe('/library');
  });

  it('drops the question mark when nothing is left', () => {
    expect(hrefWithoutSettings('/library?settings=account&verified=true')).toBe(
      '/library',
    );
  });
});
