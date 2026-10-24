import type {
  SettingsResolvedTheme,
  SettingsThemeBrowser,
  SettingsThemePreference,
  SettingsThemeStore,
} from './settings.type';
import { SETTINGS_THEME_PREFERENCES } from './settings.type';

// Browser-wide, not per account: the startup script runs before any account is known.
const THEME_KEY = 'mado:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
export const DEFAULT_THEME_PREFERENCE: SettingsThemePreference = 'system';

// Runs in <head> before the body paints, so a saved Dark never flashes Light first.
// Plain ES5 with no imports, because it runs before any bundle loads. Tests keep it in step with resolveTheme.
export const SETTINGS_THEME_SCRIPT = `(function(){try{var p=null;try{p=localStorage.getItem(${JSON.stringify(THEME_KEY)})}catch(e){}var d=p==='dark'||(p!=='light'&&matchMedia(${JSON.stringify(DARK_QUERY)}).matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})()`;

export function createSettingsThemeStore({
  window,
  root,
}: SettingsThemeBrowser): SettingsThemeStore {
  const media = window.matchMedia(DARK_QUERY);
  const listeners = new Set<() => void>();
  let preference = readThemePreference(window);

  // *** apply ***
  const apply = () =>
    root.classList.toggle(
      'dark',
      resolveTheme(preference, media.matches) === 'dark',
    );

  // *** publish ***
  const publish = (next: SettingsThemePreference) => {
    const changed = next !== preference;
    preference = next;
    apply();
    if (changed) listeners.forEach((listener) => listener());
  };

  // The store lives as long as the page, so its listeners are never removed.
  media.addEventListener('change', apply);
  window.addEventListener('storage', (event) => {
    // A null key means another tab cleared all storage.
    if (event.key === null || event.key === THEME_KEY)
      publish(readThemePreference(window));
  });
  apply();

  return {
    getSnapshot: () => preference,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    setPreference(next) {
      publish(next);
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch (error) {
        // The choice still holds for this page; a reload falls back to System.
        console.error('Failed to save the theme setting', error);
      }
    },
  };
}

// *** readThemePreference ***
// Storage can be blocked (private mode, site data off), and even reading localStorage can throw.
function readThemePreference(
  window: SettingsThemeBrowser['window'],
): SettingsThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(THEME_KEY));
  } catch {
    return DEFAULT_THEME_PREFERENCE;
  }
}

// *** parseThemePreference ***
function parseThemePreference(raw: string | null): SettingsThemePreference {
  return (
    SETTINGS_THEME_PREFERENCES.find((value) => value === raw) ??
    DEFAULT_THEME_PREFERENCE
  );
}

// *** resolveTheme ***
function resolveTheme(
  preference: SettingsThemePreference,
  deviceIsDark: boolean,
): SettingsResolvedTheme {
  if (preference !== 'system') return preference;
  return deviceIsDark ? 'dark' : 'light';
}

export { resolveTheme, THEME_KEY };
