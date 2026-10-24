import { useSyncExternalStore } from 'react';

import type {
  SettingsThemePreference,
  SettingsThemeStore,
} from './settings.type';
import {
  createSettingsThemeStore,
  DEFAULT_THEME_PREFERENCE,
} from './settings-theme';

/** The server has no storage, so it renders System and the client fixes it after hydration. */
export function useSettingsTheme() {
  const preference = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => DEFAULT_THEME_PREFERENCE,
  );

  return { preference, setPreference };
}

// Created on first use, because the server has no window to build it with.
let store: SettingsThemeStore | null = null;

// *** getStore ***
function getStore() {
  store ??= createSettingsThemeStore({
    window,
    root: document.documentElement,
  });
  return store;
}

// *** subscribe ***
function subscribe(listener: () => void) {
  return getStore().subscribe(listener);
}

// *** getSnapshot ***
function getSnapshot() {
  return getStore().getSnapshot();
}

// *** setPreference ***
function setPreference(preference: SettingsThemePreference) {
  getStore().setPreference(preference);
}
