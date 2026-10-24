import { describe, expect, it, vi } from 'vitest';

import type {
  SettingsThemeBrowser,
  SettingsThemePreference,
} from './settings.type';
import {
  createSettingsThemeStore,
  resolveTheme,
  SETTINGS_THEME_SCRIPT,
  THEME_KEY,
} from './settings-theme';

describe('createSettingsThemeStore', () => {
  it('follows the device when nothing is saved', () => {
    const light = fakeBrowser({ deviceIsDark: false });
    expect(createSettingsThemeStore(light).getSnapshot()).toBe('system');
    expect(light.isDark()).toBe(false);

    const dark = fakeBrowser({ deviceIsDark: true });
    createSettingsThemeStore(dark);
    expect(dark.isDark()).toBe(true);
  });

  it('applies a saved choice over the device', () => {
    const browser = fakeBrowser({ saved: 'light', deviceIsDark: true });
    expect(createSettingsThemeStore(browser).getSnapshot()).toBe('light');
    expect(browser.isDark()).toBe(false);
  });

  it('treats a bad saved value as system', () => {
    const browser = fakeBrowser({ saved: 'blue', deviceIsDark: true });
    expect(createSettingsThemeStore(browser).getSnapshot()).toBe('system');
    expect(browser.isDark()).toBe(true);
  });

  it('saves a choice, applies it and tells subscribers', () => {
    const browser = fakeBrowser({ deviceIsDark: false });
    const store = createSettingsThemeStore(browser);
    const listener = vi.fn();
    store.subscribe(listener);

    store.setPreference('dark');

    expect(store.getSnapshot()).toBe('dark');
    expect(browser.isDark()).toBe(true);
    expect(browser.storage.get(THEME_KEY)).toBe('dark');
    expect(listener).toHaveBeenCalledOnce();
  });

  it('does not tell subscribers when the choice stays the same', () => {
    const store = createSettingsThemeStore(fakeBrowser({ saved: 'dark' }));
    const listener = vi.fn();
    store.subscribe(listener);

    store.setPreference('dark');

    expect(listener).not.toHaveBeenCalled();
  });

  it('stops telling a subscriber after it unsubscribes', () => {
    const store = createSettingsThemeStore(fakeBrowser({}));
    const listener = vi.fn();
    store.subscribe(listener)();

    store.setPreference('dark');

    expect(listener).not.toHaveBeenCalled();
  });

  it('still switches when storage is blocked', () => {
    const browser = fakeBrowser({ blocked: true, deviceIsDark: false });
    const store = createSettingsThemeStore(browser);
    vi.spyOn(console, 'error').mockImplementation(() => {});

    store.setPreference('dark');

    expect(store.getSnapshot()).toBe('dark');
    expect(browser.isDark()).toBe(true);
  });

  it('follows device changes only under system', () => {
    const browser = fakeBrowser({ deviceIsDark: false });
    const store = createSettingsThemeStore(browser);

    browser.setDevice(true);
    expect(browser.isDark()).toBe(true);

    store.setPreference('light');
    browser.setDevice(true);
    expect(browser.isDark()).toBe(false);
  });

  it('follows a change saved in another tab', () => {
    const browser = fakeBrowser({ deviceIsDark: false });
    const store = createSettingsThemeStore(browser);
    const listener = vi.fn();
    store.subscribe(listener);

    browser.storage.set(THEME_KEY, 'dark');
    browser.fireStorage(THEME_KEY);

    expect(store.getSnapshot()).toBe('dark');
    expect(browser.isDark()).toBe(true);
    expect(listener).toHaveBeenCalledOnce();
  });

  it('goes back to system when another tab clears storage', () => {
    const browser = fakeBrowser({ saved: 'dark', deviceIsDark: false });
    const store = createSettingsThemeStore(browser);

    browser.storage.clear();
    browser.fireStorage(null);

    expect(store.getSnapshot()).toBe('system');
    expect(browser.isDark()).toBe(false);
  });

  it('ignores changes to other keys', () => {
    const browser = fakeBrowser({});
    const store = createSettingsThemeStore(browser);
    const listener = vi.fn();
    store.subscribe(listener);

    browser.storage.set(THEME_KEY, 'dark');
    browser.fireStorage('mado:other');

    expect(store.getSnapshot()).toBe('system');
    expect(listener).not.toHaveBeenCalled();
  });
});

describe('SETTINGS_THEME_SCRIPT', () => {
  const saved = ['light', 'dark', 'system', 'blue', undefined];
  const cases = saved.flatMap((value) =>
    [true, false].map((dark): [string | undefined, boolean] => [value, dark]),
  );

  it.each(cases)(
    'matches the store for saved %s, device dark %s',
    (value, deviceIsDark) => {
      const script = fakeBrowser({ saved: value, deviceIsDark });
      runScript(script);
      const store = fakeBrowser({ saved: value, deviceIsDark });
      createSettingsThemeStore(store);

      expect(script.isDark()).toBe(store.isDark());
    },
  );

  it('follows the device when storage is blocked', () => {
    const browser = fakeBrowser({ blocked: true, deviceIsDark: true });
    runScript(browser);
    expect(browser.isDark()).toBe(true);
  });
});

describe('resolveTheme', () => {
  it.each<[SettingsThemePreference, boolean, string]>([
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['system', true, 'dark'],
    ['system', false, 'light'],
  ])('resolves %s on a dark device %s to %s', (preference, dark, expected) => {
    expect(resolveTheme(preference, dark)).toBe(expected);
  });
});

// *** fakeBrowser ***
function fakeBrowser({
  saved,
  deviceIsDark = false,
  blocked = false,
}: {
  saved?: string;
  deviceIsDark?: boolean;
  blocked?: boolean;
}) {
  const storage = new Map<string, string>(
    saved === undefined ? [] : [[THEME_KEY, saved]],
  );
  const classes = new Set<string>();
  const mediaListeners: (() => void)[] = [];
  const storageListeners: ((event: { key: string | null }) => void)[] = [];
  const media = { matches: deviceIsDark };

  const localStorage = {
    getItem: (key: string) => {
      if (blocked) throw new Error('blocked');
      return storage.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (blocked) throw new Error('blocked');
      storage.set(key, value);
    },
  };

  const browser = {
    window: {
      localStorage,
      matchMedia: () => ({
        get matches() {
          return media.matches;
        },
        addEventListener: (_: string, listener: () => void) =>
          mediaListeners.push(listener),
      }),
      addEventListener: (
        _: string,
        listener: (event: { key: string | null }) => void,
      ) => storageListeners.push(listener),
    },
    root: {
      classList: {
        toggle: (name: string, force: boolean) => {
          if (force) classes.add(name);
          else classes.delete(name);
          return force;
        },
      },
    },
  } as unknown as SettingsThemeBrowser;

  return {
    ...browser,
    storage,
    isDark: () => classes.has('dark'),
    setDevice(dark: boolean) {
      media.matches = dark;
      mediaListeners.forEach((listener) => listener());
    },
    fireStorage(key: string | null) {
      storageListeners.forEach((listener) => listener({ key }));
    },
  };
}

// *** runScript ***
function runScript(browser: ReturnType<typeof fakeBrowser>) {
  const document = { documentElement: browser.root };
  new Function('localStorage', 'matchMedia', 'document', SETTINGS_THEME_SCRIPT)(
    browser.window.localStorage,
    browser.window.matchMedia,
    document,
  );
}
